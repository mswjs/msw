const { TextEncoder, TextDecoder } = require('util')

const PureURL = globalThis.URL

globalThis.URL = function URL(url, base) {
  try {
    console.warn('URL', { url, base })
    const final = new PureURL(url, base)
    return final
  } catch (error) {
    console.error('[URL DEBUGGER] Invalid URL:', { url, base })
    throw error
  }
}

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
