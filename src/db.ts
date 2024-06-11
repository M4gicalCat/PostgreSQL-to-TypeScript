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
      columns: { name: string; type: string; schema: string; nullable: boolean; desc?: string }[]
      schema: string
      desc?: string
    }
    const schemas: Record<string, Record<string, Pick<T, 'columns' | 'desc'>>> = {}
    await this.db.each<T>(
      `SELECT
                c.table_name as name,
                c.table_schema as schema,
                json_agg(json_build_object(
                        'name', c.column_name,
                        'type', c.udt_name,
                        'schema', c.udt_schema,
                        'nullable', c.is_nullable = 'YES',
                         'desc', pgd.description
                         )) as columns,
                obj_description((table_schema || '.' || table_name)::regclass) as "desc"
            FROM pg_catalog.pg_statio_all_tables AS st
            LEFT JOIN pg_catalog.pg_description pgd ON (pgd.objoid=st.relid)
            RIGHT JOIN information_schema.columns c ON (
                pgd.objsubid=c.ordinal_position AND
                c.table_schema=st.schemaname AND
                c.table_name=st.relname            
            )
            GROUP BY table_schema, table_name`,
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
