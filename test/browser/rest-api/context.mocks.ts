import { setupWorker, rest, HttpResponse, delay } from 'msw'

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
