import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return new Response()
  }),
)

Object.assign(window, {
  msw: {
    async startWorker() {
      await worker.start({
        serviceWorker: {
          // Use a custom Service Worker for this test that intentionally
          // delays the worker installation time. This allows us to test
          // that the "worker.start()" Promise indeed resolves only after
          // the worker has been activated and not just registered.
          url: './worker.js',
        },
      })
    },
  },
})
