const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const invariant = require('./invariant')
const { SERVICE_WORKER_BUILD_PATH } = require('../config/constants')

const cwd = process.cwd()

module.exports = function init(args) {
  const { publicDir } = args
  const resolvedPublicDir = path.resolve(cwd, publicDir)
  const dirExists = fs.existsSync(resolvedPublicDir)

  invariant(
    dirExists,
    'Provided directory does not exist under "%s".\nMake sure to include a relative path to the root directory of your server.',
    cwd,
  )

  console.log(
    'Initializing the Mock Service Worker at "%s"...',
    resolvedPublicDir,
  )

  const swFilename = path.basename(SERVICE_WORKER_BUILD_PATH)
  const swDestFilepath = path.resolve(resolvedPublicDir, swFilename)

  fs.copyFile(SERVICE_WORKER_BUILD_PATH, swDestFilepath, (error) => {
    invariant(error == null, 'Failed to copy Service Worker. %s', error)

    console.log(`
${chalk.green('Service Worker successfully created!')}
${chalk.gray(swDestFilepath)}

Continue by creating a mocking definition module in your application:

  ${chalk.cyan.bold('https://mswjs.io/docs/getting-started/mocks')}
`)
  })
}
