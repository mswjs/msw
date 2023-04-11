import { graphql, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'

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
