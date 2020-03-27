const chalk = require('chalk')
const webpack = require('webpack')
const getChecksum = require('./utils/getChecksum')
const copyServiceWorker = require('./utils/copyServiceWorker')

const PLUGIN_NAME = 'IntegrityWebpackPlugin'

class IntegrityWebpackPlugin {
  constructor(options) {
    this.options = options
  }

  apply(compiler) {
    const { src, output } = this.options

    compiler.hooks.beforeCompile.tapPromise(PLUGIN_NAME, async () => {
      console.log('Signing the Service Worker at:\n%s', chalk.cyan(src))

      // Generate the checksum based on the Service Worker file
      const checksum = getChecksum(src)

      // Copy the service worker file to the distributed directory.
      // Inject its checksum into a private variable.
      await copyServiceWorker(src, output, checksum)

      return new webpack.DefinePlugin({
        SERVICE_WORKER_CHECKSUM: JSON.stringify(checksum),
      }).apply(compiler)
    })
  }
}

module.exports = { IntegrityWebpackPlugin }
