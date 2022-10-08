import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.post('/login', () => {
    return HttpResponse.text(null, {
      headers: {
        'Set-Cookie': 'authToken=abc-123',
      },
    })
  }),
  rest.get('/user', ({ cookies }) => {
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
