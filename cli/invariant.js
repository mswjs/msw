import { styleText } from 'node:util'

export function invariant(predicate, message, ...args) {
  if (!predicate) {
    // eslint-disable-next-line no-console
    console.error(styleText('red', message), ...args)
    process.exit(1)
  }
}
