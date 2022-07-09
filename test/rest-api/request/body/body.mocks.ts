import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/deprecated', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
  rest.post('/text', async (req, res, ctx) => {
    const body = await req.text()
    return res(ctx.body(body))
  }),
)

worker.start()
