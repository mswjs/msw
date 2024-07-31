import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

// @ts-ignore
window.msw = {
  worker,
  http,
}
