const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const invariant = require('./invariant')
const cwd = process.cwd()

module.exports = function(args) {
  const { publicDir } = args
  const resolvedPublicDir = path.resolve(cwd, publicDir)
  const dirExists = fs.existsSync(resolvedPublicDir)

  invariant(
    dirExists,
    'Provided directory does not exist under "%s".\nMake sure to include a relative path to the root directory of your server.',
    cwd,
  )

  console.log(
    chalk.gray('Creating Mock Service Worker at "%s"...'),
    resolvedPublicDir,
  )

  const swSrcFilepath = path.resolve(__dirname, '../lib/mockServiceWorker.js')
  const swFilename = path.basename(swSrcFilepath)
  const swDestFilepath = path.resolve(resolvedPublicDir, swFilename)
  fs.copyFile(swSrcFilepath, swDestFilepath, (error) => {
    invariant(typeof error !== null, 'Failed to copy Service Worker. %s', error)

    console.log(`
${chalk.green('Service Worker successfully created!')}
Continue by creating a mocking module and starting the Service Worker:

  ${chalk.cyan.bold('https://redd.gitbook.io/msw/getting-started#define-mocks')}
`)
  })
}
