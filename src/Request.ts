export const Request: typeof globalThis.Request = globalThis.Request
  ? globalThis.Request
  : require('@remix-run/web-fetch').Request
