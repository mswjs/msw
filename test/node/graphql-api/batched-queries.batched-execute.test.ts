/**
 * @vitest-environment node
 * Example of mocking batched GraphQL queries via "batched-execute".
 * @see https://github.com/mswjs/msw/issues/510
 * @see https://www.apollographql.com/docs/router/executing-operations/query-batching
 */
import { http, HttpResponse, GraphQLVariables } from 'msw'
import { buildSchema, graphql as executeGraphQL } from 'graphql'
import { setupServer } from 'msw/node'
import { gql } from '../../support/graphql'

const schema = buildSchema(`
type User {
  id: ID!
}

type Product {
  name: String!
}

type Query {
  user: User
  product: Product
}
`)

export const handlers = [
  http.post<never, { query: string; variables?: GraphQLVariables }>(
    'http://localhost/graphql',
    async ({ request }) => {
      const data = await request.json()

      // "batched-execute" produces a standard-compliant GraphQL query
      // so you can resolve it against the mocked schema as-is!
      const result = await executeGraphQL({
        source: data.query,
        variableValues: data.variables,
        schema,
        rootValue: {
          // Since "batched-execute" produces a single query
          // with individual queries as fields, you have to
          // go with a field-based mocking.
          user: () => ({ id: 'abc-123' }),
          product: () => ({ name: 'Hoover 2000' }),
        },
      })

      return HttpResponse.json(result)
    },
  ),
]

const server = setupServer(...handlers)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('sends a mocked response to a batched GraphQL query', async () => {
  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: gql`
        query {
          user_0: user {
            id
          }
          product_0: product {
            name
          }
        }
      `,
    }),
  })

  const { errors, data } = await response.json()

  expect(errors).toBeUndefined()
  expect(data).toEqual({
    user_0: { id: 'abc-123' },
    product_0: { name: 'Hoover 2000' },
  })
})
