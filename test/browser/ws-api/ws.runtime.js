import { ws } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

window.msw = {
  ws,
  worker,
}
