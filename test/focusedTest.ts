import * as chalk from 'chalk'
import { spawnServer } from './support/spawnServer'

const testSuite = process.argv[2]

spawnServer(testSuite).then(({ origin }) => {
  console.log(
    `
Loaded the test suite:
%s
%s
  `,
    chalk.magenta(testSuite),
    chalk.cyan(origin),
  )
})
