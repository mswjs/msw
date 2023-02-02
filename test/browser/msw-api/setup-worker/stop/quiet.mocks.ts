import { setupWorker } from 'msw'

const worker = setupWorker()

// @ts-ignore
window.msw = {
  worker,
}
