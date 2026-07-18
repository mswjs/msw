import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupWorker } from 'msw/browser'

const api = graphql.link('/graphql')

const worker = setupWorker(
  api.query('GetUser', async ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
  api.mutation('Login', ({ query, variables }) => {
    return HttpResponse.json({
      data: {
        query,
        variables,
      },
    })
  }),
)

worker.start()
