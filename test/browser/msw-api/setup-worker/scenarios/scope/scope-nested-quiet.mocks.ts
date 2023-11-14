import { setupWorker } from 'msw/browser'

const worker = setupWorker()

worker.start({
  quiet: true,
  serviceWorker: {
    url: './public/mockServiceWorker.js',
  },
})
