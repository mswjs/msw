export const File: typeof globalThis.File = globalThis.File
  ? globalThis.File
  : require('formdata-node').File
