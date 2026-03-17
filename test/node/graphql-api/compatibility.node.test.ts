// @vitest-environment node
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient, gql } from '../../support/graphql'

const schema = gql`
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
  uri: 'http://localhost:3000/graphql',
})

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('fetches the data from a GraphQL schema', async () => {
  const result = await client({
    query: gql`
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({
    user: {
      firstName: 'John',
    },
  })
  expect.soft(result.errors).toBeUndefined()
})

it('propagates execution errors', async () => {
  const result = await client({
    query: gql`
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

  expect.soft(result.data).toBeUndefined()
  expect.soft(result.errors).toEqual([
    expect.objectContaining({
      message:
        'Cannot query field "lastName" on type "User". Did you mean "firstName"?',
    }),
  ])
})
