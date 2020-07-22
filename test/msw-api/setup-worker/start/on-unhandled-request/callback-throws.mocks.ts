import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  onUnhandledRequest(req) {
    throw new Error(`Forbid unhandled ${req.method} ${req.url.href}`)
  },
})
