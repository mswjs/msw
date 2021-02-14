import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('/login', (req, res, ctx) => {
    return res(ctx.cookie('authToken', 'abc-123'))
  }),
  rest.get('/user', (req, res, ctx) => {
    if (req.cookies.authToken == null) {
      return res(
        ctx.status(403),
        ctx.json({
          error: 'Auth token not found',
        }),
      )
    }

    return res(
      ctx.json({
        firstName: 'John',
        lastName: 'Maverick',
      }),
    )
  }),
)

worker.start()
