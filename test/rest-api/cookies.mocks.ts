import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.cookie('my-cookie', 'value'),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
