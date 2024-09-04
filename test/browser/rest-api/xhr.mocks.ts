import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('https://api.github.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),

  http.post('https://api.github.com/users/octocat', () => {
    return HttpResponse.json({ mocked: true })
  }),
)

worker.start()
