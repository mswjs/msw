// Include the root-level common exports so that the browser bundle
// can export everything from a single module ("msw" import root).
export * from '..'

export { setupWorker } from '../setupWorker/setupWorker'
export type { SetupWorker, StartOptions } from '../setupWorker/glossary'
export { SetupWorkerApi } from '../setupWorker/setupWorker'
