#!/usr/bin/env node
const yargs = require('yargs')

yargs
  .usage('$0 <cmd> [args]')
  .command(
    'init <publicDir>',
    'Initializes Mock Service Worker at the specified directory',
    (yargs) => {
      yargs.positional('publicDir', {
        type: 'string',
        description: 'Relative path to server public directory',
        required: true,
        normalize: true,
      })
    },
    require('./init'),
  )
  .help().argv
