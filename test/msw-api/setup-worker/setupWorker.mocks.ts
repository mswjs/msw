import { setupWorker, rest } from 'msw'

// @ts-ignore
const worker = setupWorker([
  rest.get('/book/:bookId', function originalResolver(req, res, ctx) {
    return res(ctx.json({ title: 'Original title' }))
  }),
])

worker.start()
