import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.get('/single-cookie', () => {
    return new HttpResponse(null, {
      headers: {
        'Set-Cookie': 'myCookie=value',
      },
    })
  }),
  http.get('/multiple-cookies', () => {
    return new HttpResponse(null, {
      headers: [
        ['Set-Cookie', 'firstCookie=yes'],
        ['Set-Cookie', 'secondCookie=no; Max-Age=1000'],
        ['Set-Cookie', 'thirdCookie=1,2,3'],
      ],
    })
  }),
  http.get('/cookies-via-headers', () => {
    const headers = new Headers({
      'Set-Cookie': 'myCookie=value',
    })

    return new HttpResponse(null, { headers })
  }),
)

worker.start()
