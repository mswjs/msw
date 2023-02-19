import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/api/books', (req, res, ctx) => {
    const bookId = req.url.searchParams.get('id')

    return res(
      ctx.json({
        bookId,
      }),
    )
  }),

  rest.post('https://test.mswjs.io/products', (req, res, ctx) => {
    const productIds = req.url.searchParams.getAll('id')

    return res(
      ctx.json({
        productIds,
      }),
    )
  }),
)

worker.start()
