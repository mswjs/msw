import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

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
