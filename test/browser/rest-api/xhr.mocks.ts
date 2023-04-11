import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('https://api.github.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
