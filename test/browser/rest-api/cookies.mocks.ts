import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/user', () => {
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
  http.get('/order', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: [
          ['Set-Cookie', 'firstCookie=yes'],
          ['Set-Cookie', 'secondCookie=no; Max-Age=1000'],
          ['Set-Cookie', 'thirdCookie=1,2,3'],
        ],
      },
    )
  }),
)

worker.start()
