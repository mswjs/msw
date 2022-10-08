import { setupWorker, rest, HttpResponse } from 'msw'

// interface ResponseType {
//   username: string
//   messageId: string
// }

type RequestParams = {
  username: string
  messageId: string
}

const worker = setupWorker(
  rest.get<RequestParams>(
    'https://api.github.com/users/:username/messages/:messageId',
    ({ params }) => {
      const { username, messageId } = params

      return HttpResponse.json({
        username,
        messageId,
      })
    },
  ),
)

worker.start()
