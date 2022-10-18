export const ReadableStream: typeof globalThis.ReadableStream =
  globalThis.ReadableStream
    ? globalThis.ReadableStream
    : require('@remix-run/web-fetch').ReadableStream
