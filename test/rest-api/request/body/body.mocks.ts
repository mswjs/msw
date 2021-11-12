import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
)

worker.start()
