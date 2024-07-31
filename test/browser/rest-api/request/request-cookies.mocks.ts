import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('*/cookies', ({ cookies }) => {
    return HttpResponse.json(cookies)
  }),
  http.post('/set-cookies', async ({ request }) => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': await request.clone().text(),
      },
    })
  }),
)

worker.start()
