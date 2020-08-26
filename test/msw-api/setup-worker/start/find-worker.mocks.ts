import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.status(200))
  }),
)

// @ts-ignore
window.__MSW_REGISTRATION__ = worker
  .start({
    // This is the default matching behavior if left unspecified
    findWorker: (scriptURL, mockServiceWorkerUrl) =>
      scriptURL === mockServiceWorkerUrl,
  })
  .then((reg) => {
    console.log('Registration Promise resolved', reg)
    return reg.constructor.name
  })
