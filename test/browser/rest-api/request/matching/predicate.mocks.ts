import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post(
    async ({ request }) => {
      const body = await request.clone().json()
      return body.foo === 'bar'
    },
    () => {
      return HttpResponse.json({ matched: true })
    },
  ),
)

worker.start()
