import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/login', () => {
    return HttpResponse.text(null, {
      headers: {
        'Set-Cookie': 'authToken=abc-123',
      },
    })
  }),
  http.get('/user', ({ cookies }) => {
    if (cookies.authToken == null) {
      return HttpResponse.json(
        { error: 'Auth token not found' },
        { status: 403 },
      )
    }

    return HttpResponse.json({
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),
)

worker.start()
