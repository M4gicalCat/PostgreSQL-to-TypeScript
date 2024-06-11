import Db from './db'
import { getType, sanitizeComment, toCamelCase } from './utils'

export async function main(connectionString: string, givenSchemas: string[] = []): Promise<string> {
  const db = new Db(connectionString)

  const types = await db.findTypes(givenSchemas)
  const tables = await db.findTables(givenSchemas)

  const schemas: Record<string, { types: (typeof types)[string]; tables: (typeof tables)[string] }> = {}
  for (const schema in types) {
    schemas[schema] = { types: types[schema], tables: tables[schema] ?? [] }
  }
  let out = `export namespace Db {
  export type Json = number | string | boolean | null | { [x: string]: Json } | Json[]
`

  for (const [schema, { types, tables }] of Object.entries(schemas)) {
    out += `  export namespace ${toCamelCase(schema)} {
`
    for (const [name, { desc, values }] of Object.entries(types)) {
      // set `∕` instead of `/` to prevent closing the comment
      if (desc) {
        out += `    /** ${sanitizeComment(desc)} */
`
      }
      out += `    export type ${name} = ${values.map((v) => `'${v}'`).join(' | ')}
`
    }

    for (const [name, { columns, desc }] of Object.entries(tables)) {
      if (desc) {
        out += `    /** ${sanitizeComment(desc)} */
`
      }
      out += `    export interface ${toCamelCase(name)} {
`
      for (const col of columns) {
        if (col.desc) {
          out += `      /** ${sanitizeComment(col.desc)} */
`
        }
        out += `      ${col.name}: ${getType(col, schemas)},
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
