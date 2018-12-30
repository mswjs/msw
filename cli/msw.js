#!/usr/bin/env node
const yargs = require('yargs')

yargs
  .usage('$0 <cmd> [args]')
  .command(
    'create <rootDir>',
    'Creates Mock Service Worker at the specified directory',
    (yargs) => {
      yargs.positional('rootDir', {
        type: 'string',
        description: 'Server root path (relative to current working directory)',
        normalize: true,
      })
    },
    require('./create'),
  )
  .help().argv
