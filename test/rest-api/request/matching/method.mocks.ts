import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.post('*/user', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
