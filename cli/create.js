const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const invariant = require('./invariant')
const cwd = process.cwd()

module.exports = function(args) {
  const { rootDir } = args
  const resolvedRootDir = path.resolve(cwd, rootDir)
  const dirExists = fs.existsSync(resolvedRootDir)

  invariant(
    dirExists,
    'Provided directory does not exist under "%s".\nMake sure to include a relative path to the root directory of your server.',
    cwd,
  )

  console.log(
    chalk.gray('Creating Mock Service Worker at "%s"...'),
    resolvedRootDir,
  )

  const swSrcFilepath = path.resolve(__dirname, '../mockServiceWorker.js')
  const swFilename = path.basename(swSrcFilepath)
  const swDestFilepath = path.resolve(resolvedRootDir, swFilename)
  fs.copyFile(swSrcFilepath, swDestFilepath, (error) => {
    invariant(typeof error !== null, 'Failed to copy Service Worker. %s', error)

    console.log(`
${chalk.green('Service Worker successfully created!')}
Continue by creating a mocking module and starting the Service Worker:

  ${chalk.cyan.bold('msw.start()')}
`)
  })
}
