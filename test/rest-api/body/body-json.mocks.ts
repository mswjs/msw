import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/json', (req, res, ctx) => {
    return res(ctx.json({ firstName: 'John' }))
  }),
)

worker.start()
