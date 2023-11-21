/**
 * @vitest-environment node
 */
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  graphql.query('GetUser', ({ cookies }) => {
    const { session } = cookies

    if (!session) {
      return HttpResponse.json({
        errors: [
          {
            name: 'Unauthorized',
            message: 'Must be authorized to query "GetUser"',
          },
        ],
      })
    }

    return HttpResponse.json({
      data: {
        user: {
          name: 'John',
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

it('responds to a GraphQL query when the request has the cookies', async () => {
  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: {
      Cookie: 'session=superSecret',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query GetUser {
          user {
            name
          }
        }
      `,
    }),
  })
  const result = await response.json()

  expect(result.data).toEqual({
    user: { name: 'John' },
  })
  expect(result.errors).toBeUndefined()
})

it('errors on a GraphQL query when the request is missig the cookies', async () => {
  const response = await fetch('http://localhost/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query GetUser {
          user {
            name
          }
        }
      `,
    }),
  })
  const result = await response.json()

  expect(result.errors).toEqual([
    {
      name: 'Unauthorized',
      message: 'Must be authorized to query "GetUser"',
    },
  ])
  expect(result.data).toBeUndefined()
})
