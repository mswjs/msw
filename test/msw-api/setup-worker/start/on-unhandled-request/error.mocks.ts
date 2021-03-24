import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user/:id', (req, res, ctx) => {
    if (req.params.id === 'undefined_response') {
      return
    }
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  // Produce an error and cancel a request, if it's not handled
  // in the request handlers above.
  onUnhandledRequest: 'error',
})
