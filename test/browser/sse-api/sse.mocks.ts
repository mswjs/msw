import { http, sse } from 'msw'
import { setupWorker } from 'msw/browser'

window.msw = {
  setupWorker,
  // @ts-ignore
  http,
  sse,
}
