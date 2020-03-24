const fs = require('fs')
const path = require('path')
const chalk = require('chalk')

const INTEGRITY_FILE_PATH = path.resolve(__dirname, '..', 'integrity.json')

/**
 * Updates "integrity.json" manifest file that acts as the source of truth
 * when comparing integrity from a running instance of Service Worker
 * with the latest published integrity checksum.
 */
module.exports = function updateIntegrityManifest(nextChecksum) {
  const fileContent = JSON.parse(fs.readFileSync(INTEGRITY_FILE_PATH, 'utf8'))
  const { serviceWorkerIntegrity: prevChecksum } = fileContent

  const nextIntegrityContent = {
    ...fileContent,
    serviceWorkerIntegrity: nextChecksum,
  }

  fs.writeFile(
    INTEGRITY_FILE_PATH,
    JSON.stringify(nextIntegrityContent, null, 2),
    (error) => {
      if (error) {
        console.error(chalk.red('Failed to update integrity manifest.'))
        console.error(error)
      }

      console.log(
        'Integrity manifest updated!\n\tPrev: %s\n\tNext: %s',
        chalk.red(prevChecksum),
        chalk.green(nextChecksum),
      )
    },
  )
}
