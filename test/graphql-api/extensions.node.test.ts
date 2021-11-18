/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { graphql } from 'msw'
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

test("adds extensions to the original response's data", async () => {
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
  const body = await res.json()
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
