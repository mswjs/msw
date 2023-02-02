import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  // Produce an error and cancel a request, if it's not handled
  // in the request handlers above.
  onUnhandledRequest: 'error',
})
