import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start({
  /**
   * @note This option is being deprecated.
   */
  waitUntilReady: true,
})
