import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

//@ts-expect-error invalid parameter provided to setupWorker so we can validate it throws
const worker = setupWorker([
  http.get('/book/:bookId', function originalResolver() {
    return HttpResponse.json({ title: 'Original title' })
  }),
])

worker.start()
