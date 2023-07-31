import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  // WARNING: Intentionally invalid example of including a query parameter
  // in the request handler URL. Don't do that, consider matching against a path
  // and accessing query parameters in the response resolver instead.
  http.get('/user?name=admin', () => {
    return HttpResponse.text('user-response')
  }),
  http.post('/login?id=123&type=auth', () => {
    return HttpResponse.text('login-response')
  }),
)

worker.start()
