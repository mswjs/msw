import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/login', (req, res, ctx) => {
    const { body } = req

    if (typeof body === 'object') {
      return res(ctx.json(body))
    }

    return res(ctx.text(body))
  }),
)

worker.start()
