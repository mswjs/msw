import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.status(200))
  }),
)

// @ts-ignore
window.msw = {
  registration: worker
    .start({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      findWorker: (scriptURL, _mockServiceWorkerUrl) => {
        return scriptURL.includes('some-bad-filename-that-does-not-exist.js')
      },
    })
    .then((reg) => {
      console.log('Registration Promise resolved')
      // This will throw as as there is no instance returned with a non-matching worker name.
      return reg.constructor.name
    })
    .catch((error) => {
      console.error('Error - no worker instance after starting', error)
      throw error
    }),
}
