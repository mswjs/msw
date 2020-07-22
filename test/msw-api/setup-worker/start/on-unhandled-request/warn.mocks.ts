import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  // Warn on the requests that are not handled in the request handlers above.
  // Does not cancel the request.
  onUnhandledRequest: 'warn',
})
