import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('https://api.github.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
