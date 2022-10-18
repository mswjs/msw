export const Headers: typeof globalThis.Headers = globalThis.Headers
  ? globalThis.Headers
  : require('headers-polyfill').Headers
