import { setupWorker, rest } from 'msw'

interface ResponseType {
  username: string
  messageId: string
}

type RequestParams = {
  username: string
  messageId: string
}

const worker = setupWorker(
  rest.get<never, RequestParams, ResponseType>(
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
