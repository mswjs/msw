import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://example.com/users/:username', ({ params }) => {
    const { username } = params

    return HttpResponse.json({
      name: 'John Maverick',
      originalUsername: username,
    })
  }),
)

worker.start()

Object.assign(window, { worker })
