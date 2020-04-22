import { ComposeMocksInternalContext } from '../glossary'

export const createStop = (context: ComposeMocksInternalContext) => {
  /**
   * Stop the active running instance of the Service Worker.
   */
  return function stop() {
    // Signal the Service Worker to disable mocking for this client.
    // Use this an an explicit way to stop the mocking, while preserving
    // the worker-client relation. Does not affect the worker's lifecycle.
    context.worker?.postMessage('MOCK_DEACTIVATE')
  }
}
