// @vitest-environment node
import cookieUtils from '@bundled-es-modules/cookie'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const schema = /* GraphQL */ `
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

    return HttpResponse.json(
      {
        data,
        errors,
      },
      {
        headers: {
          'Set-Cookie': 'test-cookie=value',
        },
      },
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
      query: /* GraphQL */ `
        query GetUser {
          user {
            firstName
          }
        }
      `,
    }),
  })
  const body = await res.json()
  const cookieString = res.headers.get('set-cookie')!
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
