import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

// The next line will be ignored because we want to test that an Error
// should be trown when `setupWorker` parameters are not valid
//@ts-ignore
const worker = setupWorker([
  http.get('/book/:bookId', function originalResolver() {
    return HttpResponse.json({ title: 'Original title' })
  }),
])

worker.start()
