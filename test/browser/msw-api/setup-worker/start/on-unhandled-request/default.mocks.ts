import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json({ firstName: 'John' })
  }),
)

// By default any unhandled requests are preformed as-is
// but produce warnings.
worker.start()
