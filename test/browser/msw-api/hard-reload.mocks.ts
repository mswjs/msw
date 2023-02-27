import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/resource', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

worker.start()
