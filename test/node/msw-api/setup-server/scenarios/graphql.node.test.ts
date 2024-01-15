/**
 * @vitest-environment node
 */
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient, gql } from '../../../../support/graphql'

const apolloClient = createGraphQLClient({
  uri: 'http://localhost:3000',
  fetch,
})

const GET_USER_DETAIL = gql`
  query GetUserDetail($userId: String!) {
    user {
      id
      firstName
      age
    }
  }
`

const LOGIN = gql`
  mutation Login($username: String!) {
    user {
      id
    }
  }
`

const server = setupServer(
  graphql.query('GetUserDetail', ({ variables }) => {
    const { userId } = variables

    return HttpResponse.json({
      data: {
        user: {
          id: userId,
          firstName: 'John',
          age: 32,
        },
      },
    })
  }),
  graphql.mutation('Login', ({ variables }) => {
    const { username } = variables

    return HttpResponse.json({
      errors: [
        {
          message: `User "${username}" is not found`,
          locations: [
            {
              line: 12,
              column: 4,
            },
          ],
        },
      ],
    })
  }),
)

server.events.on('request:start', ({ request }) => {
  console.log(request.method, request.url)
})

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('returns the mocked response for a GraphQL query', async () => {
  const res = await apolloClient({
    query: GET_USER_DETAIL,
    variables: {
      userId: 'abc-123',
    },
  })

  expect(res.errors).toBeUndefined()
  expect(res.data).toEqual({
    user: {
      firstName: 'John',
      age: 32,
      id: 'abc-123',
    },
  })
})

test('returns the mocked response for a GraphQL mutation', async () => {
  const res = await apolloClient({
    query: LOGIN,
    variables: {
      username: 'john',
    },
  })

  expect(res.data).toBeUndefined()
  expect(res.errors).toEqual([
    {
      message: `User "john" is not found`,
      locations: [
        {
          line: 12,
          column: 4,
        },
      ],
    },
  ])
})
