/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import type { ExecutionResult } from 'graphql'
import { buildSchema, graphql as executeGraphql } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { gql } from '../support/graphql'

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

test('adds extensions to the original response data', async () => {
  const res = await fetch('https://api.mswjs.io', {
    method: 'POST',
    headers: {
      accept: '*/*',
      'content-type': 'application/json',
    },
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
  const body: ExecutionResult = await res.json()

  expect(res.status).toBe(200)
  expect(body.data).toEqual({
    user: {
      firstName: 'John',
    },
  })
  expect(body.errors).toBeUndefined()
  expect(body.extensions).toEqual({
    tracking: {
      version: 1,
      page: '/test',
    },
  })
})
