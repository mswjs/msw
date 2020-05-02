#!/usr/bin/env node
const yargs = require('yargs')

yargs
  .usage('$0 <cmd> [args]')
  .command(
    'init <publicDir>',
    'Initializes Mock Service Worker at the specified directory',
    (yargs) => {
      yargs
        .positional('publicDir', {
          type: 'string',
          description: 'Relative path to the public directory',
          required: true,
          normalize: true,
        })
        .example('init', 'msw init public')
    },
    require('./init'),
  )
  .demandCommand()
  .help().argv
