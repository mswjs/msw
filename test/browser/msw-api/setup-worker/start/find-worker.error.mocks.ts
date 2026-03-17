import { http } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return new Response()
  }),
)

Object.assign(window, {
  msw: {
    registration: worker
      .start({
        findWorker: (scriptURL, _mockServiceWorkerUrl) => {
          return scriptURL.includes('some-bad-filename-that-does-not-exist.js')
        },
      })
      .then((registration) => {
        console.log('Registration Promise resolved')
        // This will throw as as there is no instance returned with a non-matching worker name.
        return registration?.constructor.name
      })
      .catch((error) => {
        console.error('Error - no worker instance after starting', error)
        throw error
      }),
  },
})
