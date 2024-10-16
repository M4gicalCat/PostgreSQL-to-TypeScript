"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const db_1 = __importDefault(require("./db"));
const utils_1 = require("./utils");
async function main(connectionString, givenSchemas = []) {
    const db = new db_1.default(connectionString);
    db.schemas = givenSchemas;
    const types = await db.findTypes();
    const customTypes = await db.findCustoms();
    const tables = await db.findTables();
    const fKeys = await db.findFKeys();
    const schemas = {};
    const schemasNames = new Set([...Object.keys(types), ...Object.keys(tables)]);
    for (const schema of schemasNames) {
        schemas[schema] = { types: types[schema], tables: tables[schema] ?? [] };
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
`;
    out += `export namespace Db {
  export type Json = number | string | boolean | null | { [x: string]: Json } | Json[]
`;
    if (customTypes.length) {
        out += `  export namespace ${(0, utils_1.toCamelCase)(db_1.default.TYPES_SCHEMA)} {
`;
        for (const custom of customTypes) {
            out += `    export type ${custom.name} = ${custom.value}
`;
        }
        out += `  }
`;
    }
    for (const [schema, { types, tables }] of Object.entries(schemas)) {
        // don't write definition for psql schemas, or custom types
        if (['pg_catalog', 'information_schema', db_1.default.TYPES_SCHEMA].includes(schema))
            continue;
        out += `  export namespace ${(0, utils_1.toCamelCase)(schema)} {
`;
        for (const [name, { desc, values }] of Object.entries(types ?? {})) {
            // set `∕` instead of `/` to prevent closing the comment
            const sanitized = (0, utils_1.sanitizeComment)(desc);
            if (sanitized.length) {
                out += `    /** ${sanitized} */
`;
            }
            out += `    export enum ${name} {
${values.map((v) => `      ${v.toUpperCase().replace(/ /g, '_')} = '${v}'`).join(',\n')}
    }
`;
        }
        for (const [name, { columns, desc }] of Object.entries(tables ?? {})) {
            const sanitized = (0, utils_1.sanitizeComment)(desc);
            if (sanitized.length) {
                out += `    /** ${sanitized} */
`;
            }
            out += `    export interface ${(0, utils_1.toCamelCase)(name)} {
`;
            for (const col of columns) {
                const fKey = fKeys[schema]?.[name]?.[col.name];
                const sanitized = (0, utils_1.sanitizeComment)(desc);
                if (sanitized.length) {
                    out += `      /** ${sanitized} */
`;
                }
                if (fKey) {
                    out += `      // foreign key \`${fKey.constraint}\`
`;
                }
                out += `      ${col.name}: ${(0, utils_1.getType)(col, schemas, fKey)},
`;
            }
            out += `    }
`;
        }
        out += `  }

`; // end schema namespace
    }
    out += `}
`;
    return out;
}
exports.main = main;
//# sourceMappingURL=index.js.map