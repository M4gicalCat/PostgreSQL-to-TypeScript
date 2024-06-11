#! /usr/bin/env node

import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import fs from 'node:fs'
import { main } from './index'

const argv = yargs(hideBin(process.argv))
  .usage('Usage: $0 <command> [options]')
  .example('$0 -c postgres://username:password@localhost/db -o output.ts', 'generate typescript interfaces from schema')
  .options({
    conn: {
      alias: 'c',
      describe: 'database connection string',
      demandOption: true,
      type: 'string'
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
