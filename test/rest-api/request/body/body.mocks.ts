import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/deprecated', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
  rest.post('/text', async (req, res, ctx) => {
    const body = await req.text()
    return res(ctx.body(body))
  }),
  rest.post('/json', async (req, res, ctx) => {
    const json = await req.json()
    return res(ctx.json(json))
  }),
  rest.post('/arrayBuffer', async (req, res, ctx) => {
    const arrayBuffer = await req.arrayBuffer()
    return res(ctx.body(arrayBuffer))
  }),
)

worker.start()
