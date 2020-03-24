const fs = require('fs')
const chalk = require('chalk')
const crypto = require('crypto')
const minify = require('babel-minify')

/**
 * Minifies and removes the comments from the given Service Worker module.
 * Generates an idempotent checksum based on its contents.
 */
module.exports = function getChecksum(sourceFilePath) {
  const fileContent = fs.readFileSync(sourceFilePath, 'utf8')
  const { code } = minify(
    fileContent,
    {},
    {
      comments: false,
    },
  )

  const checksum = crypto
    .createHash('md5')
    .update(code, 'utf8')
    .digest('hex')

  console.log('Generated checksum: %s', chalk.magenta(checksum))

  return checksum
}
