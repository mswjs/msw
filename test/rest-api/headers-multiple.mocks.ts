import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('https://test.mswjs.io', (req, res, ctx) => {
    return res(
      ctx.json({
        'x-header': req.headers.get('x-header'),
      }),
    )
  }),

  rest.get('https://test.mswjs.io', (req, res, ctx) => {
    return res(
      ctx.set({
        Accept: ['application/json', 'image/png'],
      }),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
