import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker()
worker.start()

worker.use(
  http.get('/v1/issues', () => {
    return HttpResponse.text('get-body')
  }),
)

worker.use(
  http.post('/v1/issues', () => {
    return HttpResponse.text('post-body')
  }),
)
