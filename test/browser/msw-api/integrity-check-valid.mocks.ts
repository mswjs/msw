import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/users/octocat', (req, res, ctx) => {
    return res(ctx.json({ mocked: true }))
  }),
)

worker.start()
