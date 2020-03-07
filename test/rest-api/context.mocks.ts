import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://test.msw.io/', (req, res, ctx) => {
    return res(
      ctx.delay(2000),
      ctx.set({
        Accept: 'foo/bar',
        'Custom-Header': 'arbitrary-value',
      }),
      ctx.status(305, 'Yahoo!'),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

start()
