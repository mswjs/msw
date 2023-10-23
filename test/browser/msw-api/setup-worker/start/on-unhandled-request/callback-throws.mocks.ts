import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start({
  onUnhandledRequest(request) {
    throw new Error(`Forbid unhandled ${request.method} ${request.url}`)
  },
})
