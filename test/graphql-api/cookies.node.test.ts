/**
 * @jest-environment node
 */
import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import fetch from 'cross-fetch'
import { graphql as executeGraphql } from 'graphql'
import { buildSchema } from 'graphql/utilities'
import * as cookieUtils from 'cookie'
import { gql } from '../support/graphql'

const schema = gql`
  type User {
    id: String!
  }

  type Query {
    me: User!
  }
`

const server = setupServer(
  graphql.query('Me', async (req, res, ctx) => {
    const executionResult = await executeGraphql({
      schema: buildSchema(schema),
      source: req.body.query,
      rootValue: {
        me: {
          id: '00000000-0000-0000-0000-000000000000',
        },
      },
    })

    return res(
      ctx.cookie('test-cookie', 'value'),
      ctx.data(executionResult.data),
      ctx.errors(executionResult.errors),
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
        query Me {
          me {
            id
          }
        }
      `,
    }),
  })
  const body = await res.json()
  const cookieString = res.headers.get('set-cookie')
  const allCookies = cookieUtils.parse(cookieString)

  expect(cookieString).toBe('test-cookie=value')
  expect(body).toEqual({
    data: {
      me: {
        id: '00000000-0000-0000-0000-000000000000',
      },
    },
  })
  expect(allCookies).toHaveProperty('test-cookie', 'value')
  expect(body.errors).toBeUndefined()
})
