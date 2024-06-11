import pgp from 'pg-promise'
class Db {
  private db

  constructor(conn: string) {
    this.db = pgp({})(conn)
  }

  public async findTypes(filterSchemas: string[]) {
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
      { schemas: filterSchemas.length > 0 ? filterSchemas : null },
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

  public async findTables(filterSchemas: string[]) {
    type T = {
      name: string
      columns: { name: string; type: string; schema: string; nullable: boolean }[]
      schema: string
      desc?: string
    }
    const schemas: Record<string, Record<string, Pick<T, 'columns' | 'desc'>>> = {}
    await this.db.each<T>(
      `    
          SELECT table_name   as name,
                 table_schema as schema,
                 json_agg(json_build_object(
                         'name', column_name,
                         'type', udt_name,
                         'schema', udt_schema,
                         'nullable', is_nullable = 'YES',
                          )) as columns,
                obj_description((table_schema || '.' || table_name)::regclass) as "desc"
          FROM information_schema.columns
          WHERE $[schemas] IS NULL
             OR table_schema = ANY ($[schemas])
          GROUP BY table_schema, table_name
      `,
      { schemas: filterSchemas.length > 0 ? filterSchemas : null },
      (item: T) => {
        schemas[item.schema] ??= {}
        schemas[item.schema][item.name] = { columns: item.columns, desc: item.desc }
      }
    )
    return schemas
  }
}

export default Db
