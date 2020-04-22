const fs = require('fs')
const path = require('path')
const chalk = require('chalk')
const replace = require('@rollup/plugin-replace')
const getChecksum = require('./getChecksum')

module.exports = function integrityCheck(options) {
  const { input, output, checksumPlaceholder } = options

  function injectChecksum(checksum) {
    return {
      SERVICE_WORKER_CHECKSUM: JSON.stringify(checksum),
    }
  }

  return {
    name: 'integrity-check',
    renderChunk(...args) {
      return replace(injectChecksum(this.checksum)).renderChunk(...args)
    },
    transform(...args) {
      return replace(injectChecksum(this.checksum)).transform(...args)
    },
    buildStart() {
      if (!fs.existsSync(input)) {
        this.error(`Failed to locate the Service Worker file at: ${input}`)
      }

      console.log('Signing the Service Worker at:\n%s', chalk.cyan(input))

      this.checksum = getChecksum(input)
      const workerContent = fs.readFileSync(input, 'utf8')
      const publicWorkerContent = workerContent.replace(
        checksumPlaceholder,
        this.checksum,
      )

      this.emitFile({
        type: 'asset',
        fileName: path.basename(output),
        source: publicWorkerContent,
      })
    },
  }
}
