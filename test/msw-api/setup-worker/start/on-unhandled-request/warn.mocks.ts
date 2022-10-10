import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
  rest.post('/explicit-return', () => {
    // Short-circuiting in a handler makes it perform the request as-is,
    // but still treats this request as handled.
    return
  }),
  rest.post('/implicit-return', () => {
    // The handler that has no return also performs the request as-is,
    // still treating this request as handled.
  }),
)

worker.start({
  // Warn on the requests that are not handled in the request handlers above.
  // Does not cancel the request.
  onUnhandledRequest: 'warn',
})
