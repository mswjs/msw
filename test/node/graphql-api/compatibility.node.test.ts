// @vitest-environment node
import fetch from 'cross-fetch'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient } from '../../support/graphql'

const schema = /* GraphQL */ `
  type User {
    firstName: String!
  }

  type Query {
    user: User!
  }
`

const server = setupServer(
  graphql.query('GetUser', async ({ query }) => {
    const executionResult = await executeGraphql({
      schema: buildSchema(schema),
      source: query,
      rootValue: {
        user: {
          firstName: 'John',
        },
      },
    })

    return HttpResponse.json({
      data: executionResult.data,
      errors: executionResult.errors,
    })
  }),
)

const client = createGraphQLClient({
  uri: 'https://api.mswjs.io',
  fetch,
})

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('fetches the data from a GraphQL schema', async () => {
  const response = await client({
    query: /* GraphQL */ `
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect(response.data).toEqual({
    user: {
      firstName: 'John',
    },
  })
  expect(response.errors).toBeUndefined()
})

test('propagates the GraphQL execution errors', async () => {
  const response = await client({
    query: /* GraphQL */ `
      query GetUser {
        user {
          firstName
          # Intentionally querying a non-existing field
          # to cause a GraphQL error upon execution.
          lastName
        }
      }
    `,
  })

  expect(response.data).toBeUndefined()
  expect(response.errors).toHaveLength(1)
  expect(response.errors?.[0]).toHaveProperty(
    'message',
    'Cannot query field "lastName" on type "User". Did you mean "firstName"?',
  )
})
