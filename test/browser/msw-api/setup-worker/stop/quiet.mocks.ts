import { setupWorker } from 'msw/browser'

const worker = setupWorker()

// @ts-ignore
window.msw = {
  worker,
}
