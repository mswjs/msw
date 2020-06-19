import { setupWorker, rest } from 'msw'

const worker = setupWorker(
  // WARNING: Intentionally invalid example of including a query parameter
  // in the request handler URL. Don't do that, consider matching against a path
  // and accessing query parameters in the response resolver instead.
  rest.get('/user?name=admin', (req, res, ctx) => res()),
  rest.post('/login?id=123&type=auth', (req, res, ctx) => res()),
)

worker.start()
