#!/usr/bin/env node
const yargs = require('yargs')

yargs
  .usage('$0 <cmd> [args]')
  .command(
    'init <rootDir>',
    'Initializes Mock Service Worker at the specified directory',
    (yargs) => {
      yargs.positional('rootDir', {
        type: 'string',
        description: 'Server root path (relative to current working directory)',
        normalize: true,
      })
    },
    require('./init'),
  )
  .help().argv
