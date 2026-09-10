import { bypass, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { createGraphQLClient, gql } from '../../support/graphql'
import type { ExecutionResult } from 'graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

declare namespace window {
  export const dispatchGraphQLQuery: (uri: string) => Promise<ExecutionResult>
}

const api = graphql.link('*')

interface GetUserQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const handlers = [
  api.query<GetUserQuery>('GetUser', async ({ request }) => {
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
]

Object.assign(window, {
  dispatchGraphQLQuery: (uri: string) => {
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
  },
})

const test = defineNetwork({ handlers })

test('patches a GraphQL response', async ({ page, testServer }) => {
  const endpointUrl = testServer.http.url('/response-patching/graphql')

  const res = await page.evaluate(
    ([url]) => {
      return window.dispatchGraphQLQuery(url)
    },
    [endpointUrl.href],
  )

  expect(res.errors).toBeUndefined()
  expect(res.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })
})
