import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.post('https://api.github.com/users/:username', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

start()
