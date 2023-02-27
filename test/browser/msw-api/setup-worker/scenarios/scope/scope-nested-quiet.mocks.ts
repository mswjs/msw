import { setupWorker } from 'msw'

const worker = setupWorker()

worker.start({
  quiet: true,
  serviceWorker: {
    url: './public/mockServiceWorker.js',
  },
})
