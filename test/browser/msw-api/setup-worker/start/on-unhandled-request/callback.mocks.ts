import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  onUnhandledRequest(req) {
    console.log(`Oops, unhandled ${req.method} ${req.url.href}`)
  },
})
