import { setupWorker, rest, HttpResponse } from 'msw'

const worker = setupWorker(
  rest.post('https://test.mswjs.io', ({ request }) => {
    return HttpResponse.json({
      'x-header': request.headers.get('x-header'),
    })
  }),

  rest.get('https://test.mswjs.io', () => {
    return HttpResponse.json(
      {
        mocked: true,
      },
      {
        headers: {
          // List header values separated by comma
          // to set multie-value header on the mocked response.
          Accept: 'application/json, image/png',
        },
      },
    )
  }),
)

worker.start()
