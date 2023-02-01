import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.cookie('myCookie', 'value'),
      ctx.json({
        mocked: true,
      }),
    )
  }),
  rest.get('/order', (req, res, ctx) => {
    return res(
      ctx.cookie('firstCookie', 'yes'),
      ctx.cookie('secondCookie', 'no'),
      ctx.json({ mocked: true }),
    )
  }),
)

worker.start()
