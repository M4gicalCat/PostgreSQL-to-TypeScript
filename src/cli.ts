#! /usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs'
import { main } from './index'
import Db from './db'

const argv = yargs(hideBin(process.argv))
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
  .parseSync()

;(async () => {
  if (argv.init) {
    await new Db(argv.conn).init()
    console.log(`Initialization complete:
[SCHEMA] - "${Db.TYPES_SCHEMA}"
[TABLE]  - "${Db.TYPES_TABLE}"`)

    console.log(`
INSERT INTO "${Db.TYPES_SCHEMA}"."${Db.TYPES_TABLE}"(name, value)
VALUES (
  'myCustomType',
  '{prop: string; anArray: number[], etc: boolean}' -- any valid typescript type
);
COMMENT ON COLUMN ns.my_table.my_column IS '@custom {myCustomType}';
-- note: support for \`@type {/* a valid typescript type (not an alias)*/}\` is not currently supported
`)
    return
  }
  const formattedOutput = await main(argv.conn, argv.schemas?.map(String))
  fs.writeFileSync(argv.output, formattedOutput)
})()
  .then(() => {
    process.exit()
  })
  .catch((e) => {
    console.warn(e)
    process.exit(1)
  })
