import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.msw.io/api/books', (req, res, ctx) => {
    const bookId = req.query.get('id')
    req.query.getAll

    return res(
      ctx.json({
        bookId,
      }),
    )
  }),

  rest.post('https://test.msw.io/products', (req, res, ctx) => {
    const productIds = req.query.getAll('id')

    return res(
      ctx.json({
        productIds,
      }),
    )
  }),
)

worker.start()
