import { setupWorker } from 'msw'

const worker = setupWorker()

worker.start({
  serviceWorker: {
    url: '/mockServiceWorker.js',
  },
})
