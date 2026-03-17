import { http, bypass } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/analytics', ({ request }) => {
    return new Response(request.body)
  }),
  http.post('*/analytics-bypass', ({ request }) => {
    const nextRequest = bypass(request)
    return fetch(nextRequest)
  }),
)

worker.start()
