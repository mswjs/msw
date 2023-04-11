import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/login', () => {
    return HttpResponse.text(null, {
      status: 307,
      headers: {
        Location: '/user',
      },
    })
  }),
  rest.get('/user', () => {
    return HttpResponse.json({
      firstName: 'John',
      lastName: 'Maverick',
    })
  }),
)

worker.start()
