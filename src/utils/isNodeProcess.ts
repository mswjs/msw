/**
 * Returns a boolean indicating if the current process is running in NodeJS environment.
 */
export function isNodeProcess() {
  return typeof process === 'object'
}
