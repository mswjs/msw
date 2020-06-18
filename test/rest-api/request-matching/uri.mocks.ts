import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/made-up', (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),

  rest.get('https://test.mswjs.io/messages/:messageId', (req, res, ctx) => {
    const { messageId } = req.params

    return res(
      ctx.json({
        messageId,
      }),
    )
  }),

  rest.get(
    'https://test.mswjs.io/messages/:messageId/items',
    (req, res, ctx) => {
      const { messageId } = req.params

      return res(
        ctx.json({
          messageId,
        }),
      )
    },
  ),

  rest.get(/(.+?)\.google\.com\/path/, (req, res, ctx) => {
    return res(
      ctx.json({
        mocked: true,
      }),
    )
  }),
)

worker.start()
