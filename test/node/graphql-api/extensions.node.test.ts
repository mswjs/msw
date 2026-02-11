// @vitest-environment node
import { buildSchema, graphql as executeGraphql } from 'graphql'
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
    const { data, errors } = await executeGraphql({
      schema: buildSchema(schema),
      source: query,
      rootValue: {
        user: {
          firstName: 'John',
        },
      },
    })

    return HttpResponse.json({
      data,
      errors,
      extensions: {
        tracking: {
          version: 1,
          page: '/test',
        },
      },
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('adds extensions to the original response data', async () => {
  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

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
  expect.soft(result.extensions).toEqual({
    tracking: {
      version: 1,
      page: '/test',
    },
  })
})
