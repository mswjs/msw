/**
 * @vitest-environment node
 */
import type { ExecutionResult } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { buildSchema, graphql as executeGraphql } from 'graphql'
import { gql } from '../../support/graphql'

const schema = gql`
  type User {
    firstName: String!
  }
  type Query {
    user: User!
  }
`

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

beforeEach(() => {
  server.use(
    graphql.query(
      ({ operationName }) => operationName === 'GetUser',
      async ({ query }) => {
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
        })
      },
    ),
  )
})

test('matches requests when the predicate function returns true', async () => {
  const response = await fetch('https://api.mswjs.io', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: gql`
        query GetUser {
          user {
            firstName
          }
        }
      `,
    }),
  })

  const body: ExecutionResult = await response.json()
  expect(response.status).toBe(200)
  expect(body.data).toEqual({ user: { firstName: 'John' } })
})

test('does not match requests when the predicate function returns false', async () => {
  const response = await fetch('https://api.mswjs.io', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: gql`
        query GetTheUser {
          user {
            firstName
          }
        }
      `,
    }),
  })

  expect(response.status).toBe(404)
})
