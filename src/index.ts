import Db from './db'
import { getType, sanitizeComment, toCamelCase } from './utils'

export async function main(connectionString: string, givenSchemas: string[] = []): Promise<string> {
  const db = new Db(connectionString)
  db.schemas = givenSchemas

  const types = await db.findTypes()
  const customTypes = await db.findCustoms()
  const tables = await db.findTables()
  const fKeys = await db.findFKeys()

  const schemas: Record<string, { types: (typeof types)[string]; tables: (typeof tables)[string] }> = {}
  const schemasNames = new Set<string>([...Object.keys(types), ...Object.keys(tables)])
  for (const schema of schemasNames) {
    schemas[schema] = { types: types[schema], tables: tables[schema] ?? [] }
  }
  let out = `/*
* This file has been generated.
* Do not edit
*/

/**
* This namespace represents the database and its tables
* Each schema has its own namespace
* To access them, use: \`Db.<schema>.<table>['<column>']\`
*/
`

  out += `export namespace Db {
  export type Json = number | string | boolean | null | { [x: string]: Json } | Json[]
`
  if (customTypes.length) {
    out += `  export namespace ${toCamelCase(Db.TYPES_SCHEMA)} {
`
    for (const custom of customTypes) {
      out += `    export type ${custom.name} = ${custom.value}
`
    }
    out += `  }
`
  }

  for (const [schema, { types, tables }] of Object.entries(schemas)) {
    // don't write definition for psql schemas, or custom types
    if (['pg_catalog', 'information_schema', Db.TYPES_SCHEMA].includes(schema)) continue
    out += `  export namespace ${toCamelCase(schema)} {
`
    for (const [name, { desc, values }] of Object.entries(types ?? {})) {
      // set `∕` instead of `/` to prevent closing the comment
      const sanitized = sanitizeComment(desc)
      if (sanitized.length) {
        out += `    /** ${sanitized} */
`
      }
      out += `    export type ${name} = ${values.map((v) => `'${v}'`).join(' | ')}
`
    }

    for (const [name, { columns, desc }] of Object.entries(tables ?? {})) {
      const sanitized = sanitizeComment(desc)
      if (sanitized.length) {
        out += `    /** ${sanitized} */
`
      }
      out += `    export interface ${toCamelCase(name)} {
`
      for (const col of columns) {
        const fKey = fKeys[schema]?.[name]?.[col.name]
        const sanitized = sanitizeComment(desc)
        if (sanitized.length) {
          out += `      /** ${sanitized} */
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
