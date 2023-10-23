import { http, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  http.post('https://test.mswjs.io', ({ request }) => {
    return HttpResponse.json({
      'x-header': request.headers.get('x-header'),
    })
  }),

  http.get('https://test.mswjs.io', () => {
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
