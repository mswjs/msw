/**
 * Returns a boolean indicating if the current process is running in Node.js environment.
 * @see https://github.com/mswjs/msw/pull/255
 */
export function isNodeProcess() {
  // Check browser environment.
  if (typeof global !== 'object') {
    return false
  }

  // Check nodejs or React Native environment.
  if (
    Object.prototype.toString.call(global.process) === '[object process]' ||
    navigator.product === 'ReactNative'
  ) {
    return true
  }
}
