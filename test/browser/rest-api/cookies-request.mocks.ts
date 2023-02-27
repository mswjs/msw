import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  // Use wildcard so that we capture any "GET /user" requests
  // regardless of the origin, and can assert "same-origin" credentials.
  rest.get('*/user', ({ cookies }) => {
    return HttpResponse.json({ cookies })
  }),
)

worker.start()
