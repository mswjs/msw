import { sse } from 'msw'
import { setupWorker } from 'msw/browser'

// @ts-ignore
window.msw = {
  setupWorker,
  sse,
}
