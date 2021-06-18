import { setupWorker } from 'msw'

const worker = setupWorker()

worker.start({
  serviceWorker: {
    url: '/public/mockServiceWorker.js',
  },
})
