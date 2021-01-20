import fetch from 'cross-fetch'
import { graphql as executeGraphql } from 'graphql'
import { buildSchema } from 'graphql/utilities'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient, gql } from '../support/graphql'

const schema = gql`
  type User {
    firstName: String!
  }

  type Query {
    user: User!
  }
`

const server = setupServer(
  graphql.query('GetUser', async (req, res, ctx) => {
    const executionResult = await executeGraphql({
      schema: buildSchema(schema),
      source: req.body.query,
      rootValue: {
        user: {
          firstName: 'John',
        },
      },
    })

    return res(
      ctx.data(executionResult.data),
      ctx.errors(executionResult.errors),
    )
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
  const res = await client({
    query: gql`
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect(res.data).toEqual({
    user: {
      firstName: 'John',
    },
  })
  expect(res.errors).toBeUndefined()
})

test('propagates the GraphQL execution errors', async () => {
  const res = await client({
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

  expect(res.data).toBeUndefined()
  expect(res.errors).toHaveLength(1)
  expect(res.errors[0]).toHaveProperty(
    'message',
    'Cannot query field "lastName" on type "User". Did you mean "firstName"?',
  )
})
