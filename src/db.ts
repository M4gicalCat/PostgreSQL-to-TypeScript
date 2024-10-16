import pgp from 'pg-promise'
import { FKey } from './types'
class Db {
  private db
  private _schemas: string[] = []
  public static readonly TYPES_SCHEMA = 'psql_to_ts'
  public static readonly TYPES_TABLE = 'custom'
  constructor(conn: string) {
    this.db = pgp({})(conn)
  }

  public async findTypes() {
    type T = { type: string; value: string[]; schema: string; desc?: string }
    const schemas: Record<string, Record<string, { desc?: string; values: string[] }>> = {}
    await this.db.each<T>(
      `
          select n.nspname as schema, t.typname as "type", json_agg(e.enumlabel) as value, obj_description(t.oid) as "desc"
          from pg_type t
                   join pg_enum e on t.oid = e.enumtypid
                   join pg_catalog.pg_namespace n ON n.oid = t.typnamespace AND ($[schemas] IS NULL OR n.nspname = ANY ($[schemas]))
          group by n.nspname, t.typname, t.oid
          order by t.typname;`,
      this.schemaProp,
      (item: T) => {
        schemas[item.schema] ??= {}
        schemas[item.schema][item.type] ??= {
          values: (item.value ?? []).sort((a, b) => a.localeCompare(b)),
          desc: item.desc
        }
      }
    )
    return schemas
  }

  public async init() {
    return this.db.task(async (t) => {
      await t.none(`CREATE SCHEMA $[schema~];`, { schema: Db.TYPES_SCHEMA }).catch(() => {})
      await this.db.none(
        `
        CREATE TABLE IF NOT EXISTS $[schema~].$[table~] (
          name varchar(255) NOT NULL PRIMARY KEY,
          value text not null
        );
    `,
        { schema: Db.TYPES_SCHEMA, table: Db.TYPES_TABLE }
      )
    })
  }

  public async findCustoms() {
    return this.db
      .any<{ name: string; value: string }>(`SELECT * FROM ${Db.TYPES_SCHEMA}.${Db.TYPES_TABLE}`)
      .catch((_e) => [])
  }

  public async findTables() {
    type T = {
      name: string
      columns: { name: string; type: string; schema: string; nullable: boolean; desc?: string }[]
      schema: string
      desc?: string
    }
    const schemas: Record<string, Record<string, Pick<T, 'columns' | 'desc'>>> = {}
    await this.db.each<T>(
      `
        SELECT c.table_name AS name,
          c.table_schema AS schema,
          JSON_AGG(JSON_BUILD_OBJECT(
            'name', c.column_name,
            'type', c.udt_name,
            'schema', c.udt_schema,
            'nullable', c.is_nullable = 'YES',
            'desc', pgd.description
                   )) AS columns,
          OBJ_DESCRIPTION((c.table_schema || '.' || c.table_name)::regclass) AS "desc"
          FROM pg_catalog.pg_statio_all_tables AS st
          LEFT JOIN pg_catalog.pg_description pgd ON (pgd.objoid = st.relid)
          RIGHT JOIN information_schema.columns c ON (
            pgd.objsubid = c.ordinal_position AND
              c.table_schema = st.schemaname AND
              c.table_name = st.relname
              AND ($[schemas] IS NULL OR c.table_schema = ANY ($[schemas]))
            )
          GROUP BY table_schema, table_name`,
      this.schemaProp,
      (item: T) => {
        schemas[item.schema] ??= {}
        schemas[item.schema][item.name] = { columns: item.columns, desc: item.desc }
      }
    )
    return schemas
  }

  public async findFKeys() {
    const schemas: {
      [schema: string]: {
        [table: string]: {
          [column: string]: FKey
        }
      }
    } = {}
    type T = {
      constraint: string
      source_schema: string
      source_table: string
      source_column: string
      target_schema: string
      target_table: string
      target_column: string
    }
    await this.db.each(
      `
    SELECT
  o.conname AS "constraint",
  fn.nspname AS source_schema,
  m.relname AS source_table,
  (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = m.oid AND a.attnum = o.conkey[1] AND a.attisdropped = false) AS source_column,
  mn.nspname AS target_schema,
  f.relname AS target_table,
  (SELECT a.attname FROM pg_attribute a WHERE a.attrelid = f.oid AND a.attnum = o.confkey[1] AND a.attisdropped = false) AS target_column
  FROM
    pg_constraint o LEFT JOIN pg_class f ON f.oid = o.confrelid LEFT JOIN pg_class m ON m.oid = o.conrelid
  join pg_namespace fn on f.relnamespace = fn.oid
  join pg_namespace mn ON m.relnamespace = mn.oid
  WHERE
    o.contype = 'f' AND o.conrelid IN (SELECT oid FROM pg_class c WHERE c.relkind = 'r')
    AND ($[schemas] IS NULL OR (fn.nspname = ANY ($[schemas]) AND mn.nspname = ANY($[schemas])))
    `,
      this.schemaProp,
      (row: T) => {
        schemas[row.source_schema] ??= {}
        schemas[row.source_schema][row.source_table] ??= {}
        schemas[row.source_schema][row.source_table][row.source_column] = {
          constraint: row.constraint,
          table: row.target_table,
          schema: row.target_schema,
          column: row.target_column
        }
      }
    )
    return schemas
  }

  set schemas(value: string[]) {
    this._schemas = value
  }

  private get schemaProp() {
    return { schemas: this._schemas.length > 0 ? this._schemas : null }
  }
}

export default Db
