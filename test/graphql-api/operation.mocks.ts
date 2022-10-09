import { setupWorker, graphql, HttpResponse } from 'msw'

const worker = setupWorker(
  graphql.operation(async ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
)

worker.start({
  onUnhandledRequest: 'warn',
})
