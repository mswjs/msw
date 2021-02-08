import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/text', (req, res, ctx) => {
    return res(ctx.text('hello world'))
  }),
)

worker.start()
