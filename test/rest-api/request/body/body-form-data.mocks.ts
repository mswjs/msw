import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/sign-in', (req, res, ctx) => {
    return res(ctx.json(req.body))
  }),
)

worker.start()
