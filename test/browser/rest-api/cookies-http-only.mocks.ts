import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('/login', () => {
    return HttpResponse.text(null, {
      headers: {
        'Set-Cookie': 'authToken=abc-123; HttpOnly',
      },
    })
  }),
  http.get('/user', ({ cookies }) => {
    if (cookies.authToken == null) {
      throw HttpResponse.json(
        {
          error: 'Not authenticated',
        },
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
