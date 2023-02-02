/**
 * @jest-environment node
 */
import * as cookieUtils from 'cookie'
import fetch from 'node-fetch'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
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
      ctx.cookie('test-cookie', 'value'),
      ctx.data(data),
      ctx.errors(errors),
    )
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('sets cookie on the mocked response', async () => {
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
  const cookieString = res.headers.get('set-cookie')
  const responseCookies = cookieUtils.parse(cookieString)

  expect(cookieString).toBe('test-cookie=value')
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
      },
    },
  })
  expect(responseCookies).toHaveProperty('test-cookie', 'value')
  expect(body.errors).toBeUndefined()
})
