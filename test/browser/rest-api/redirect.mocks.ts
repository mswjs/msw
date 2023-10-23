import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/login', () => {
    return HttpResponse.text(null, {
      status: 307,
      headers: {
        Location: '/user',
      },
    })
  }),
  http.get('/user', () => {
    return HttpResponse.json({
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),
)

worker.start()
