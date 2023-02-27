import { setupWorker, rest, HttpResponse, Headers } from 'msw'

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
    const headers = new Headers()

    /**
     * @note Fetch API Headers don't support multi-value headers
     * in the HeadersInit. You can, however, set multiple
     * values by using the "append" method.
     */
    headers.append('Set-Cookie', 'firstCookie=yes')
    headers.append('Set-Cookie', 'secondCookie=no; Max-Age=1000')

    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers,
      },
    )
  }),
)

worker.start()
