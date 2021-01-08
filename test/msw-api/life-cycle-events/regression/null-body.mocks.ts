import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/api/books', (req, res, ctx) => {
    return res(ctx.status(204))
  }),
)

worker.on('response:mocked', async (res) => {
  console.warn(`[response:mocked] ${res.body}`)
})

worker.start()
