#! /usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const yargs_1 = __importDefault(require("yargs/yargs"));
const helpers_1 = require("yargs/helpers");
const node_fs_1 = __importDefault(require("node:fs"));
const index_1 = require("./index");
const db_1 = __importDefault(require("./db"));
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .usage('Usage: $0 [options]')
    .example('$0 -c postgres://username:password@localhost/db -o output.ts', 'generate typescript interfaces from schema')
    .example('$0 -c postgres://username:password@localhost/db -i', 'create the schema and table to create custom types')
    .options({
    conn: {
        alias: 'c',
        describe: 'database connection string',
        demandOption: true,
        type: 'string'
    },
    init: {
        alias: 'i',
        describe: `Only run the initialization script. Creates the schema and table needed fot custom types`,
        type: 'boolean',
        default: false
    },
    output: {
        alias: 'o',
        describe: 'output file name',
        demandOption: true,
        type: 'string'
    },
    schemas: {
        alias: 's',
        type: 'array',
        describe: 'schemas names',
        array: true
    }
})
    .strictCommands()
    .help('h')
    .alias('h', 'help')
    .parseSync();
(async () => {
    if (argv.init) {
        await new db_1.default(argv.conn).init();
        console.log(`Initialization complete:
[SCHEMA] - "${db_1.default.TYPES_SCHEMA}"
[TABLE]  - "${db_1.default.TYPES_TABLE}"`);
        console.log(`
INSERT INTO "${db_1.default.TYPES_SCHEMA}"."${db_1.default.TYPES_TABLE}"(name, value)
VALUES (
  'myCustomType',
  '{prop: string; anArray: number[], etc: boolean}' -- any valid typescript type
);
COMMENT ON COLUMN ns.my_table.my_column IS '@custom {myCustomType}';
-- note: support for \`@type {/* a valid typescript type (not an alias)*/}\` is not currently supported
`);
        return;
    }
    const formattedOutput = await (0, index_1.main)(argv.conn, argv.schemas?.map(String));
    node_fs_1.default.writeFileSync(argv.output, formattedOutput);
})()
    .then(() => {
    process.exit();
})
    .catch((e) => {
    console.warn(e);
    process.exit(1);
});
//# sourceMappingURL=cli.js.map