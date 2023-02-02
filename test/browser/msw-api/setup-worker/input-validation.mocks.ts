import { setupWorker, rest } from 'msw'

// The next line will be ignored because we want to test that an Error
// should be trown when `setupWorker` parameters are not valid
//@ts-ignore
const worker = setupWorker([
  rest.get('/book/:bookId', function originalResolver(req, res, ctx) {
    return res(ctx.json({ title: 'Original title' }))
  }),
])

worker.start()
