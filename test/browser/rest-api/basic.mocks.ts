import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/users/:username', (req, res, ctx) => {
    const { username } = req.params

    return res(
      ctx.json({
        name: 'John Maverick',
        originalUsername: username,
      }),
    )
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
