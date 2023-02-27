import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://example.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
