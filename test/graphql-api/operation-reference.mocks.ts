import { setupWorker, graphql, HttpResponse } from 'msw'

const worker = setupWorker(
  graphql.query('GetUser', async ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
  graphql.mutation('Login', ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
)

worker.start()
