import { ws } from 'msw/ws'
import { setupWorker } from 'msw/browser'

window.msw = {
  ws,
  setupWorker,
}
