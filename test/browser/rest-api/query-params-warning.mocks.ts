import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  // WARNING: Intentionally invalid example of including a query parameter
  // in the request handler URL. Don't do that, consider matching against a path
  // and accessing query parameters in the response resolver instead.
  rest.get('/user?name=admin', () => {
    return HttpResponse.text('user-response')
  }),
  rest.post('/login?id=123&type=auth', () => {
    return HttpResponse.text('login-response')
  }),
)

worker.start()
