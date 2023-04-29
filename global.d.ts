declare const SERVICE_WORKER_CHECKSUM: string

declare module '@bundled-es-modules/cookie' {
  export * as default from 'cookie'
}

declare module '@bundled-es-modules/statuses' {
  const source_default: any
  export { source_default as default }
}
