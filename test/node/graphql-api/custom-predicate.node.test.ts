// @vitest-environment node
import { graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { gql } from '../../support/graphql'

const server = setupServer()

beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' })
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

  const response = await fetch('http://localhost/irrelevant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  expect.soft(response.status).toBe(200)
  await expect.soft(response.json()).resolves.toEqual({ data: { user: 1 } })
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

  await expect(
    fetch('http://localhost/irrelevant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: gql`
          query GetCart {
            cart {
              id
            }
          }
        `,
      }),
    }),
  ).rejects.toThrow('fetch failed')
})
