const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const replace = require('@rollup/plugin-replace')
const getChecksum = require('./getChecksum')
const packageJson = require('../../../package.json')

function injectChecksum(checksum) {
  return {
    SERVICE_WORKER_CHECKSUM: JSON.stringify(checksum),
  }
}

module.exports = function integrityCheckPlugin(options) {
  const {
    input,
    output,
    checksumPlaceholder,
    packageVersionPlaceholder,
  } = options

  return {
    name: 'integrity-check',
    transform(...args) {
      this.addWatchFile(input)
      return replace(injectChecksum(this.checksum)).transform(...args)
    },
    buildStart() {
      if (!fs.existsSync(input)) {
        this.error(`Failed to locate the Service Worker file at: ${input}`)
      }

      console.log('Signing the Service Worker at:\n%s', chalk.cyan(input))

      this.checksum = getChecksum(input)

      const workerContent = fs.readFileSync(input, 'utf8')
      const publicWorkerContent = workerContent
        .replace(checksumPlaceholder, this.checksum)
        .replace(packageVersionPlaceholder, packageJson.version)

      this.emitFile({
        type: 'asset',
        fileName: path.basename(output),
        source: publicWorkerContent,
      })
    },
  }
}
