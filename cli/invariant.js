const colors = require('picocolors')

module.exports = function invariant(predicate, message, ...args) {
  if (!predicate) {
    console.error(colors.red(message), ...args)
    process.exit(1)
  }
}
