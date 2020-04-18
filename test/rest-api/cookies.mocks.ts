import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('/user', (req, res, ctx) => {
    return res(
      ctx.cookie('my-cookie', 'value'),
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

start()
