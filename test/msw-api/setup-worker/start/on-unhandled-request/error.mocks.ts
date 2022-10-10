import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

worker.start({
  // Produce an error and cancel a request, if it's not handled
  // in the request handlers above.
  onUnhandledRequest: 'error',
})
