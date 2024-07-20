import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

// @ts-expect-error
window.msw = {
  worker,
  http,
}
