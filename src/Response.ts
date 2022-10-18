export const Response: typeof globalThis.Response = globalThis.Response
  ? globalThis.Response
  : require('@remix-run/web-fetch').Response
