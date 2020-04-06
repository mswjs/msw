import { composeMocks, rest } from 'msw'

const { start } = composeMocks(
  rest.get('https://api.github.com/users/octocat', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

start()
