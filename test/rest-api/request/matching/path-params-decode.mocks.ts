import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/reflect-url/:url', (req, res, ctx) => {
    const { url } = req.params

    return res(ctx.json({ url }))
  }),
)

worker.start()
