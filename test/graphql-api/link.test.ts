import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../support/graphql'

const LINK_EXAMPLE = require.resolve('./link.mocks.ts')

const server = new HttpServer((app) => {
  app.post('/graphql', (req, res) => {
    res.status(500).end()
  })
})

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('mocks a GraphQL query to the GitHub GraphQL API', async ({
  loadExample,
  query,
}) => {
  await loadExample(LINK_EXAMPLE)

  const res = await query('https://api.github.com/graphql', {
    query: gql`
      query GetUser($username: String!) {
        user(username: $username) {
          id
          username
        }
      }
    `,
    variables: {
      username: 'john',
    },
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      user: {
        id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
        username: 'john',
      },
    },
  })
})

test('mocks a GraphQL mutation to the Stripe GraphQL API', async ({
  loadExample,
  query,
}) => {
  await loadExample(LINK_EXAMPLE)

  const res = await query('https://api.stripe.com/graphql', {
    query: gql`
      mutation Payment($amount: Int!) {
        bankAccount {
          totalFunds
        }
      }
    `,
    variables: {
      amount: 350,
    },
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      bankAccount: {
        totalFunds: 450,
      },
    },
  })
})

test('falls through to the matching GraphQL operation to an unknown endpoint', async ({
  loadExample,
  query,
}) => {
  await loadExample(LINK_EXAMPLE)

  const res = await query('/graphql', {
    query: gql`
      query GetUser($username: String!) {
        user(username: $username) {
          id
          username
        }
      }
    `,
    variables: {
      username: 'john',
    },
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-request-handler', 'fallback')
  expect(body).toEqual({
    data: {
      user: {
        id: '46cfe8ff-a79b-42af-9699-b56e2239d1bb',
        username: 'john',
      },
    },
  })
})

test('bypasses a GraphQL operation to an unknown endpoint', async ({
  loadExample,
  query,
}) => {
  await loadExample(LINK_EXAMPLE)

  const res = await query(server.http.url('/graphql'), {
    query: gql`
      mutation Payment($amount: Int!) {
        bankAccount {
          totalFunds
        }
      }
    `,
    variables: {
      amount: 350,
    },
  })

  expect(res.status()).toBe(500)
})
