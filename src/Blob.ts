export const Blob: typeof globalThis.Blob = globalThis.Blob
  ? globalThis.Blob
  : require('@remix-run/web-fetch').Blob
