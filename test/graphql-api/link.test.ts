import * as path from 'path'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'link.mocks.ts'),
    routes(app) {
      app.post('/graphql', (req, res) => {
        res.status(500).end()
      })
    },
  })
}

test('mocks a GraphQL query to the GitHub GraphQL API', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: `
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
    },
    {
      uri: 'https://api.github.com/graphql',
    },
  )

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
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

test('mocks a GraphQL mutation to the Stripe GraphQL API', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: `
      mutation Payment($amount: Int!) {
        bankAccount {
          totalFunds
        }
      }
    `,
      variables: {
        amount: 350,
      },
    },
    {
      uri: 'https://api.stripe.com/graphql',
    },
  )

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      bankAccount: {
        totalFunds: 450,
      },
    },
  })
})

test('falls through to the matching GraphQL operation to an unknown endpoint', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
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

test('bypasses a GraphQL operation to an unknown endpoint', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: `
      mutation Payment($amount: Int!) {
        bankAccount {
          totalFunds
        }
      }
    `,
      variables: {
        amount: 350,
      },
    },
    {
      uri: runtime.makeUrl('/graphql'),
    },
  )

  const status = res.status()
  expect(status).toBe(500)
})
