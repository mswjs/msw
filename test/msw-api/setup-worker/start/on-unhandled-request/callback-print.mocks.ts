import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start({
  onUnhandledRequest(req, print) {
    console.log(`Oops, unhandled ${req.method} ${req.url.href}`)

    if (req.url.pathname.includes('/use-warn')) {
      // Using "print" allows you to execute the default strategy.
      print.warning()
    } else {
      print.error()
    }
  },
})
