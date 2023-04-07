// Re-export the code MSW API (e.g. "rest", "RequestHandler") because
// they are available from the "msw" (browser) root-level export.
export * from '~/core'

export { setupWorker } from './setupWorker/setupWorker'
export type { SetupWorker, StartOptions } from './setupWorker/glossary'
export { SetupWorkerApi } from './setupWorker/setupWorker'
