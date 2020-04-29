import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  rest.get(
    'https://api.github.com/users/:username/messages/:messageId',
    (req, res, ctx) => {
      const { username, messageId } = req.params

      return res(
        ctx.json({
          username,
          messageId,
        }),
      )
    },
  ),
)

worker.start()
