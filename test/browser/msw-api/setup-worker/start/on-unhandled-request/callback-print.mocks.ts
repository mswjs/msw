import { setupWorker } from 'msw/browser'

const worker = setupWorker()

Object.assign(window, {
  msw: {
    worker,
  },
})
