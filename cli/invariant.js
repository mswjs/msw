const chalk = require('chalk')

module.exports = function (predicate, message, ...args) {
  if (!predicate) {
    console.error(chalk.red(message), ...args)
    process.exit(1)
  }
}
