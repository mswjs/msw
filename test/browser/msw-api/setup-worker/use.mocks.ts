import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/book/:bookId', function originalResolver(req, res, ctx) {
    return res(ctx.json({ title: 'Original title' }))
  }),
)

worker.start()

// @ts-ignore
// Propagate the worker and `rest` references to be globally available.
// This would allow to modify request handlers on runtime.
window.msw = {
  worker,
  rest,
}
