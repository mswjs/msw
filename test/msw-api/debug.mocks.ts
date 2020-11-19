import { setupWorker, rest, debug } from 'msw'

const worker = setupWorker(
  rest.get('/foo', (req, res, ctx) => {
    return res(ctx.body('test'))
  }),
  debug,
)

worker.start()
