import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/api/books', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/authors', () => {
    return new HttpResponse(null, { status: 304 })
  }),
)

worker.start()
