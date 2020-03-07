import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://api.github.com/users/:username', (req, res, ctx) => {
    const { username } = req.params

    return res(
      ctx.json({
        name: 'John Maverick',
        originalUsername: username,
      }),
    )
  }),
)

start()
