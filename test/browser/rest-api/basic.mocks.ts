import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/users/:username', ({ params }) => {
    const { username } = params

    return HttpResponse.json({
      name: 'John Maverick',
      originalUsername: username,
    })
  }),
)

worker.start()

// @ts-ignore
window.worker = worker
