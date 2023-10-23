import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/json', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.get('/number', () => {
    return HttpResponse.json(123)
  }),
)

worker.start()
