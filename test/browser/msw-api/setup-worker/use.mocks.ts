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

Object.assign(window, {
  msw: {
    worker,
    http,
    HttpResponse,
  },
})
