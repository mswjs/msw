import { setupWorker, graphql, bypass, HttpResponse } from 'msw'
import { createGraphQLClient, gql } from '../support/graphql'

interface GetUserQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const worker = setupWorker(
  graphql.query<GetUserQuery>('GetUser', async ({ request }) => {
    const originalResponse = await fetch(...bypass(request))
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

const registration = worker.start()

// @ts-ignore
window.msw = {
  registration,
}

// @ts-ignore
window.dispatchGraphQLQuery = (uri: string) => {
  const client = createGraphQLClient({ uri })

  return client({
    query: gql`
      query GetUser {
        user {
          firstName
          lastName
        }
      }
    `,
  })
}
