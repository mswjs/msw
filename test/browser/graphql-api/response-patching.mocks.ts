import { graphql, bypass, HttpResponse } from 'msw'
import { setupWorker } from 'msw/browser'
import { createGraphQLClient, gql } from '../../support/graphql'

interface GetUserQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const worker = setupWorker(
  graphql.query<GetUserQuery>('GetUser', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const originalJson = await originalResponse.json()

    return HttpResponse.json({
      data: {
        user: {
          firstName: 'Christian',
          lastName: originalJson.data?.user?.lastName,
        },
      },
      errors: originalJson.errors,
    })
  }),
)

Object.assign(window, {
  msw: {
    registration: worker.start(),
  },
  dispatchGraphQLQuery: (uri: string) => {
    const client = createGraphQLClient({ uri })

    return client({
      query: /* GraphQL */ `
        query GetUser {
          user {
            firstName
            lastName
          }
        }
      `,
    })
  },
})
