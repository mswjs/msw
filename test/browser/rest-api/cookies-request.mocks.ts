import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  // Use wildcard so that we capture any "GET /user" requests
  // regardless of the origin, and can assert "same-origin" credentials.
  http.get('*/user', ({ cookies }) => {
    return HttpResponse.json({ cookies })
  }),
)

worker.start()
