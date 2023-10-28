import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/empty', () => {
    return HttpResponse.empty()
  }),
)

worker.start()
