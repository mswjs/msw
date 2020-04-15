import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://api.github.com', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

start()
