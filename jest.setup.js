const { TextEncoder, TextDecoder } = require('util')

/**
 * @note Temporary global polyfills for Jest because it's
 * ignoring Node.js defaults.
 */
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
})

const { Request, Response, Headers, File, Blob, FormData } = require('undici')

Object.defineProperties(globalThis, {
  Headers: { value: Headers },
  Request: { value: Request },
  Response: { value: Response },
  File: { value: File },
  Blob: { value: Blob },
  FormData: { value: FormData },
})

Object.defineProperty(navigator || {}, 'serviceWorker', {
  writable: false,
  value: {
    addEventListener: () => null,
  },
})
