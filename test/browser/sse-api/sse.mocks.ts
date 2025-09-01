import { http, sse } from 'msw'
import { setupWorker } from 'msw/browser'

// @ts-ignore
window.msw = {
  setupWorker,
  http,
  sse,
}
