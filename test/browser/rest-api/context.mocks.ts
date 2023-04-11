import { rest, HttpResponse, delay } from 'msw'
import { setupWorker } from 'msw/browser'

const worker = setupWorker(
  rest.get('https://test.mswjs.io/', async () => {
    await delay(2000)
    return HttpResponse.json(
      { mocked: true },
      {
        status: 201,
        statusText: 'Yahoo!',
        headers: {
          Accept: 'foo/bar',
          'Custom-Header': 'arbitrary-value',
        },
      },
    )
  }),
)

worker.start()
