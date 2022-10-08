import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.get('/user', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          /**
           * @todo "cookie" parser will treat this as two
           * separate cookies. It's because it expects
           * a single cookie string. This is also what
           * "document.cookie" expects. But "Headers" don't
           * support defining multiple "Set-Cookie" values.
           * @see https://stackoverflow.com/a/63254504/2754939
           */
          'Set-Cookie': 'myCookie=value; Max-Age=2592000',
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
        headers: {
          'Set-Cookie': 'firstCookie=yes; secondCookie=no',
        },
      },
    )
  }),
)

worker.start()
