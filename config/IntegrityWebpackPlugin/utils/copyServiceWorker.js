const fs = require('fs')
const path = require('path')
const util = require('util')
const chalk = require('chalk')
const { until } = require('@open-draft/until')

/**
 * Copies the given Service Worker source file into the destination.
 * Injects the integrity checksum into the destination file.
 */
module.exports = async function copyServiceWorker(
  sourceFilePath,
  destFilePath,
  checksum,
) {
  console.log('Compiling Service Worker...')

  const [readError, fileContent] = await until(() =>
    fs.promises.readFile(sourceFilePath, 'utf8'),
  )

  if (readError) {
    throw new Error('Failed to read file.\n${readError.message}')
  }

  const destFileDirectory = path.dirname(destFilePath)

  if (!fs.existsSync(destFileDirectory)) {
    console.log('Destination directory does not exist, creating...')
    await fs.promises.mkdir(destFileDirectory, { recursive: true })
  }

  const nextFileContent = fileContent.replace('<INTEGRITY_CHECKSUM>', checksum)
  const [writeFileError] = await until(() =>
    fs.promises.writeFile(destFilePath, nextFileContent),
  )

  if (writeFileError) {
    throw new Error(`Failed to write file.\n${writeFileError.message}`)
  }

  console.log('Service Worker copied to: %s', chalk.cyan(destFilePath))
}
