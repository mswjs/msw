import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('https://api.github.com/users/:username', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
