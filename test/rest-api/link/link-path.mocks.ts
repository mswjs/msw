import { setupWorker, rest } from 'msw'

const github = rest.link('https://:subdomain.github.com/')

const worker = setupWorker(
  github.get('/users/:username', (req, res, ctx) => {
    const { subdomain, username } = req.params
    return res(
      ctx.json({
        subdomain,
        name: 'John Maverick',
        originalUsername: username,
      }),
    )
  }),
  github.post(/\/repos/, (req, res, ctx) => {
    const { subdomain } = req.params
    return res(
      ctx.json({
        subdomain,
        mocked: true,
      }),
    )
  }),
)

worker.start()
