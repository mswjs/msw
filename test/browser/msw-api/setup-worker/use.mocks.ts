import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/book/:bookId', function originalResolver() {
    return HttpResponse.json({
      title: 'Original title',
    })
  }),
)

worker.start()

// @ts-ignore
// Propagate the worker and `http` references to be globally available.
// This would allow to modify request handlers on runtime.
window.msw = {
  worker,
  http,
  HttpResponse,
}
