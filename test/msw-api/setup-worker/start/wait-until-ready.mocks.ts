import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/numbers', (req, res, ctx) => {
    return res(ctx.json([1, 2, 3]))
  }),
)

// By default, starting the worker defers the network requests
// until the worker is ready to intercept them.
worker.start()

// Although this request is performed alognside an asynchronous
// worker registration, it's being deferred by `worker.start`,
// so it will happen only when the worker is ready.
fetch('/numbers')
