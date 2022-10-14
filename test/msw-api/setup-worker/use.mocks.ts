import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/book/:bookId', function originalResolver() {
    return HttpResponse.json({
      title: 'Original title',
    })
  }),
)

worker.start()

// @ts-ignore
// Propagate the worker and `rest` references to be globally available.
// This would allow to modify request handlers on runtime.
window.msw = {
  worker,
  rest,
  HttpResponse,
}
