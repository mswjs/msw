/**
 * Returns a boolean indicating if the current process is running in NodeJS environment.
 */
// Please see https://github.com/mswjs/msw/pull/255
export function isNodeProcess() {
  if (typeof global !== 'object') {
    // check browser environment
    return false
  }

  if (
    Object.prototype.toString.call(global.process) === '[object process]' ||
    navigator.product === 'ReactNative'
  ) {
    // check nodejs or react native environment
    return true
  }
}
