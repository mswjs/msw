import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/numbers', (req, res, ctx) => {
    return res(ctx.json([1, 2, 3]))
  }),
)

worker.start({
  waitUntilReady: false,
})

// Without deferring the network requests until the worker is ready,
// there is a race condition between the worker's registration and
// any runtime requests that may happen meanwhile.
fetch('/numbers')
