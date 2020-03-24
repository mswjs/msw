const fs = require('fs')
const util = require('util')
const chalk = require('chalk')
const { until } = require('@open-draft/until')

const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)

/**
 * Copies the given Service Worker source file into the destination.
 * Injects the integrity checksum into the destination file.
 */
module.exports = async function compileServiceWorker(
  sourceFilePath,
  destFilePath,
  checksum,
) {
  console.log('Compiling Service Worker...')

  const [readError, fileContent] = await until(() =>
    readFile(sourceFilePath, 'utf8'),
  )

  if (readError) {
    throw new Error('Failed to read file.\n${readError.message}')
  }

  const nextFileContent = fileContent.replace('<INTEGRITY_CHECKSUM>', checksum)
  const [writeFileError] = await until(() =>
    writeFile(destFilePath, nextFileContent),
  )

  if (writeFileError) {
    throw new Error(`Failed to write file.\n${writeFileError.message}`)
  }

  console.log('Service Worker copied to: %s', chalk.cyan(destFilePath))
}
