import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

type RequestParams = {
  username: string
  messageId: string
}

const worker = setupWorker(
  http.get<RequestParams>(
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
