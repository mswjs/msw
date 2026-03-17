import { ws } from 'msw'
import { setupWorker } from 'msw/browser'

window.msw = {
  ws,
  setupWorker,
}
