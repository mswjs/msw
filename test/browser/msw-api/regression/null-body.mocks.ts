import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/api/204', () => {
    return new HttpResponse(null, { status: 204 })
  }),
  http.get('/api/205', () => {
    return new HttpResponse(null, { status: 205 })
  }),
  http.get('/api/304', () => {
    return new HttpResponse(null, { status: 304 })
  }),
)

worker.start()
