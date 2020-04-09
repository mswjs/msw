import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.post('https://test.msw.io/', (req, res, ctx) => {
    return res(
      ctx.json({
        accept: req.headers.get('accept'),
      }),
    )
  }),

  rest.get('https://test.msw.io', (req, res, ctx) => {
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

start()
