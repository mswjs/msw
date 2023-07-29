import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/posts', () => {
    // Setting response status code without status text
    // implicitly sets the correct status text.
    return HttpResponse.text(null, { status: 403 })
  }),
  http.get('/user', () => {
    // Response status text can be overridden
    // to an arbitrary string value.
    return HttpResponse.text(null, {
      status: 401,
      statusText: 'Custom text',
    })
  }),
)

worker.start()
