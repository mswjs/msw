import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { gql } from '../support/graphql'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'document-node.mocks.ts'),
  })
}

test('intercepts a GraphQL query based on its DocumentNode', async () => {
  const runtime = await prepareRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: gql`
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect(res.status()).toEqual(200)
  expect(await res.allHeaders()).toHaveProperty('x-powered-by', 'msw')

  const json = await res.json()
  expect(json).toEqual({
    data: {
      user: {
        firstName: 'John',
      },
    },
  })
})

test('intercepts a GraphQL mutation based on its DocumentNode', async () => {
  const runtime = await prepareRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: gql`
      mutation Login {
        session {
          id
        }
      }
    `,
    variables: {
      username: 'octocat',
    },
  })

  expect(res.status()).toEqual(200)
  expect(await res.allHeaders()).toHaveProperty('x-powered-by', 'msw')

  const json = await res.json()
  expect(json).toEqual({
    data: {
      session: {
        id: 'abc-123',
      },
      user: {
        username: 'octocat',
      },
    },
  })
})

test('intercepts a scoped GraphQL query based on its DocumentNode', async () => {
  const runtime = await prepareRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: gql`
        query GetSubscription {
          subscription {
            id
          }
        }
      `,
    },
    {
      uri: 'https://api.github.com/graphql',
    },
  )

  expect(res.status()).toEqual(200)
  expect(await res.allHeaders()).toHaveProperty('x-powered-by', 'msw')

  const json = await res.json()
  expect(json).toEqual({
    data: {
      subscription: {
        id: 123,
      },
    },
  })
})
