/**
 * @jest-environment node
 */
import type { ExecutionResult } from 'graphql'
import { buildSchema, graphql as executeGraphql } from 'graphql'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import fetch from 'node-fetch'
import { gql } from '../../support/graphql'

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
    const { data, errors } = await executeGraphql({
      schema: buildSchema(schema),
      source: req.body.query,
      rootValue: {
        user: {
          firstName: 'John',
        },
      },
    })

    return res(
      ctx.data(data),
      ctx.errors(errors),
      ctx.extensions({
        tracking: {
          version: 1,
          page: '/test',
        },
      }),
    )
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

  expect(res.status).toEqual(200)
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
