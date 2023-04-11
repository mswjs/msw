import { rest, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          'Set-Cookie': 'myCookie=value; Max-Age=2000',
        },
      },
    )
  }),
  rest.get('/order', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: [
          ['Set-Cookie', 'firstCookie=yes'],
          ['Set-Cookie', 'secondCookie=no; Max-Age=1000'],
        ],
      },
    )
  }),
)

worker.start()
