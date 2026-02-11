import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

window.msw = {
  // @ts-expect-error
  worker,
  http,
}
