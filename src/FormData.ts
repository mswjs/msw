export const FormData: typeof globalThis.FormData = globalThis.FormData
  ? globalThis.FormData
  : require('@remix-run/web-fetch').FormData
