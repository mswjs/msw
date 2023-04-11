import { rest } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    return new Response()
  }),
)

// @ts-ignore
window.msw = {
  registration: worker
    .start({
      // This is the default matching behavior if left unspecified.
      findWorker(scriptURL, mockServiceWorkerUrl) {
        return scriptURL === mockServiceWorkerUrl
      },
    })
    .then((registration) => {
      console.log('Registration Promise resolved', registration)
      return registration?.constructor.name
    }),
}
