import { test, expect } from '../playwright.extend'
import { gql } from '../support/graphql'

const DOCUMENT_NODE_EXAMPLE = require.resolve('./document-node.mocks.ts')

test('intercepts a GraphQL query based on its DocumentNode', async ({
  loadExample,
  query,
}) => {
  await loadExample(DOCUMENT_NODE_EXAMPLE)

  const res = await query('/graphql', {
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

test('intercepts a GraphQL mutation based on its DocumentNode', async ({
  loadExample,
  query,
}) => {
  await loadExample(DOCUMENT_NODE_EXAMPLE)

  const res = await query('/graphql', {
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

test('intercepts a scoped GraphQL query based on its DocumentNode', async ({
  loadExample,
  query,
}) => {
  await loadExample(DOCUMENT_NODE_EXAMPLE)

  const res = await query('https://api.github.com/graphql', {
    query: gql`
      query GetSubscription {
        subscription {
          id
        }
      }
    `,
  })

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
