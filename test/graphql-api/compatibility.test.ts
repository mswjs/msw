import { graphql as executeGraphql, GraphQLError } from 'graphql'
import { buildSchema } from 'graphql/utilities'
import { createApolloFetch } from 'apollo-fetch'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'

const schema = `
type User {
  firstName: String!
}

type Query {
  user: User!
}
`

const server = setupServer(
  graphql.query('GetUser', async (req, res, ctx) => {
    const executionResult = await executeGraphql(
      buildSchema(schema),
      req.body.query,
      {
        user: {
          firstName: 'John',
        },
      },
      req.variables,
    )

    return res(
      ctx.data(executionResult.data),
      ctx.errors(executionResult.errors),
    )
  }),
)

const client = createApolloFetch({
  uri: 'https://api.mswjs.io',
})

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('fetches the data from a GraphQL schema', async () => {
  const res = await client({
    query: `
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect(res.data).toEqual({ user: { firstName: 'John' } })
  expect(res.errors).toBeUndefined()
})

test('propagates the GraphQL execution errors', async () => {
  const res = await client({
    query: `
      query GetUser {
        user {
          firstName
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
