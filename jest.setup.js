const { TextEncoder, TextDecoder } = require('util')

/**
 * @note Temporary global polyfills for Jest because it's
 * ignoring Node.js defaults.
 */
Object.defineProperties(globalThis, {
  TextDecoder: { value: TextDecoder },
  TextEncoder: { value: TextEncoder },
})

const { Blob } = require('buffer')
const { Request, Response, Headers, File, FormData } = require('undici')

Object.defineProperties(globalThis, {
  Headers: { value: Headers },
  Request: { value: Request },
  Response: { value: Response },
  File: { value: File },
  Blob: { value: Blob },
  FormData: { value: FormData },
})

if (typeof window !== 'undefined') {
  Object.defineProperty(navigator || {}, 'serviceWorker', {
    writable: false,
    value: {
      addEventListener: () => null,
    },
  })
}
