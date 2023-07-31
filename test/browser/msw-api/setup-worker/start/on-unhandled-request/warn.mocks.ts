import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  http.post('/explicit-return', () => {
    // Short-circuiting in a handler makes it perform the request as-is,
    // but still treats this request as handled.
    return
  }),
  http.post('/implicit-return', () => {
    // The handler that has no return also performs the request as-is,
    // still treating this request as handled.
  }),
)

worker.start({
  // Warn on the requests that are not handled in the request handlers above.
  // Does not cancel the request.
  onUnhandledRequest: 'warn',
})
