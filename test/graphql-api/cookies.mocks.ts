import { setupWorker, graphql, HttpResponse } from 'msw'

const worker = setupWorker(
  graphql.query('GetUser', () => {
    return HttpResponse.json(
      {
        data: {
          firstName: 'John',
        },
      },
      {
        headers: {
          'Set-Cookie': 'test-cookie=value',
        },
      },
    )
  }),
)

worker.start()
