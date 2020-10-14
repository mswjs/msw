import { setupWorker, rest } from 'msw'

const github = rest.link('https://api.github.com/')

const worker = setupWorker(
  github.get('/users/:username', (req, res, ctx) => {
    const { username } = req.params
    return res(
      ctx.json({
        name: 'John Maverick',
        originalUsername: username,
      }),
    )
  }),
  github.post(/\/repos/, (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

worker.start()
