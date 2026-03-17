// @vitest-environment node
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient, gql } from '../../support/graphql'

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

it('intercepts request cookies', async () => {
  server.use(
    graphql.query('GetSession', ({ cookies }) => {
      return HttpResponse.json({
        data: {
          session: {
            id: cookies.sessionId,
          },
        },
      })
    }),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const result = await client({
    query: gql`
      query GetSession {
        session {
          id
        }
      }
    `,
    headers: {
      cookie: 'sessionId=abc123',
    },
  })

  expect.soft(result.data).toEqual({
    session: { id: 'abc123' },
  })
  expect.soft(result.errors).toBeUndefined()
})

it('mocks a single response cookie', async () => {
  server.use(
    graphql.mutation<{ user: { email: string } }, { email: string }>(
      'SignIn',
      ({ variables }) => {
        return HttpResponse.json(
          {
            data: {
              user: {
                email: variables.email,
              },
            },
          },
          {
            headers: {
              'set-cookie': 'sessionId=abc-123',
            },
          },
        )
      },
    ),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const result = await client({
    query: gql`
      mutation SignIn($email: String!) {
        user {
          email
        }
      }
    `,
    variables: {
      email: 'test@example.com',
    },
  })

  expect
    .soft(result.response.headers.get('set-cookie'))
    .toBe('sessionId=abc-123')
  expect.soft(result.data).toEqual({
    user: { email: 'test@example.com' },
  })
  expect.soft(result.errors).toBeUndefined()
})

it('mocks a multi-value response cookie', async () => {
  server.use(
    graphql.mutation<{ user: { email: string } }, { email: string }>(
      'SignIn',
      ({ variables }) => {
        return HttpResponse.json(
          {
            data: {
              user: {
                email: variables.email,
              },
            },
          },
          {
            headers: [
              ['set-cookie', 'sessionId=abc-123'],
              ['set-cookie', 'userId=123'],
            ],
          },
        )
      },
    ),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const result = await client({
    query: gql`
      mutation SignIn($email: String!) {
        user {
          email
        }
      }
    `,
    variables: {
      email: 'test@example.com',
    },
  })

  expect
    .soft(result.response.headers.get('set-cookie'))
    .toBe('sessionId=abc-123, userId=123')
  expect.soft(result.data).toEqual({
    user: { email: 'test@example.com' },
  })
  expect.soft(result.errors).toBeUndefined()
})
