import { setupWorker, sse } from 'msw/browser'

// @ts-ignore
window.msw = {
  setupWorker,
  sse,
}
