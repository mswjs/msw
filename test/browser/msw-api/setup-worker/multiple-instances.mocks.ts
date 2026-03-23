import { setupWorker } from 'msw/browser'

Object.assign(window, {
  msw: {
    setupWorker,
  },
})
