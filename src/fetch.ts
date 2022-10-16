export const Headers: typeof globalThis.Headers = globalThis.Headers
  ? globalThis.Headers
  : require('headers-polyfill').Headers

export const Request: typeof globalThis.Request = globalThis.Request
  ? globalThis.Request
  : require('@remix-run/web-fetch').Request

export const Response: typeof globalThis.Response = globalThis.Response
  ? globalThis.Response
  : require('@remix-run/web-fetch').Response

export const ReadableStream: typeof globalThis.ReadableStream =
  globalThis.ReadableStream
    ? globalThis.ReadableStream
    : require('@remix-run/web-fetch').ReadableStream

export const Blob: typeof globalThis.Blob = globalThis.Blob
  ? globalThis.Blob
  : require('@remix-run/web-fetch').Blob

export const FormData: typeof globalThis.FormData = globalThis.FormData
  ? globalThis.FormData
  : require('@remix-run/web-fetch').FormData

export const File: typeof globalThis.File = globalThis.File
  ? globalThis.File
  : require('formdata-node').File
