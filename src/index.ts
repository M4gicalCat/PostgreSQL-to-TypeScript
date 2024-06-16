import Db from './db'
import { getType, sanitizeComment, toCamelCase } from './utils'

export async function main(connectionString: string, givenSchemas: string[] = []): Promise<string> {
  const db = new Db(connectionString)
  db.schemas = givenSchemas

  const types = await db.findTypes()
  const tables = await db.findTables()
  const fKeys = await db.findFKeys()

  const schemas: Record<string, { types: (typeof types)[string]; tables: (typeof tables)[string] }> = {}
  const schemasNames = new Set<string>([...Object.keys(types), ...Object.keys(tables)])
  for (const schema of schemasNames) {
    schemas[schema] = { types: types[schema], tables: tables[schema] ?? [] }
  }
  let out = `export namespace Db {
  export type Json = number | string | boolean | null | { [x: string]: Json } | Json[]
`

  for (const [schema, { types, tables }] of Object.entries(schemas)) {
    // don't write definition for psql schemas
    if (['pg_catalog', 'information_schema'].includes(schema)) continue
    out += `  export namespace ${toCamelCase(schema)} {
`
    for (const [name, { desc, values }] of Object.entries(types ?? {})) {
      // set `∕` instead of `/` to prevent closing the comment
      if (desc) {
        out += `    /** ${sanitizeComment(desc)} */
`
      }
      out += `    export type ${name} = ${values.map((v) => `'${v}'`).join(' | ')}
`
    }

    for (const [name, { columns, desc }] of Object.entries(tables ?? {})) {
      if (desc) {
        out += `    /** ${sanitizeComment(desc)} */
`
      }
      out += `    export interface ${toCamelCase(name)} {
`
      for (const col of columns) {
        const fKey = fKeys[schema]?.[name]?.[col.name]
        if (col.desc) {
          out += `      /** ${sanitizeComment(col.desc)} */
`
        }
        if (fKey) {
          out += `      // foreign key \`${fKey.constraint}\`
`
        }
        out += `      ${col.name}: ${getType(col, schemas, fKey)},
`
      }
      out += `    }
`
    }
    out += `  }

` // end schema namespace
  }
  out += `}
`

  return out
}
