import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/login', (req, res, ctx) => {
    return res(ctx.status(307), ctx.set('Location', '/user'))
  }),
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.json({
        firstName: 'John',
        lastName: 'Maverick',
      }),
    )
  }),
)

worker.start()
