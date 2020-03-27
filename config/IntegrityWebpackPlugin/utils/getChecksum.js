const fs = require('fs')
const chalk = require('chalk')
const crypto = require('crypto')
const minify = require('babel-minify')

/**
 * Returns an MD5 checksum for minified and normalized Service Worker file.
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
