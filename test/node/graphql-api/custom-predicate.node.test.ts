// @vitest-environment node
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient, gql } from '../../support/graphql'

const server = setupServer()

beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'bypass',
  })
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('matches requests when the predicate function returns true', async () => {
  server.use(
    graphql.query(
      ({ operationName }) => {
        return operationName.toLowerCase().includes('user')
      },
      () => {
        return HttpResponse.json({ data: { user: 1 } })
      },
    ),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const result = await client({
    query: gql`
      query GetUser {
        user {
          firstName
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({ user: 1 })
  expect.soft(result.errors).toBeUndefined()
})

it('does not match requests when the predicate function returns false', async () => {
  server.use(
    graphql.query(
      ({ operationName }) => {
        return operationName.toLowerCase().includes('user')
      },
      () => {
        return HttpResponse.json({ data: { user: 1 } })
      },
    ),
  )

  const client = createGraphQLClient({
    uri: 'http://localhost:3000/graphql',
  })

  const requestError = await client({
    query: gql`
      query GetCart {
        cart {
          id
        }
      }
    `,
  }).catch((error) => error)

  expect.soft(requestError).toBeInstanceOf(Error)
  expect.soft(requestError.message).toEqual('fetch failed')
})
