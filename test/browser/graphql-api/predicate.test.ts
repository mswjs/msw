import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { gql } from '../../support/graphql'
import { test, expect } from '../playwright.extend'

const PREDICATE_EXAMPLE = new URL('./predicate.mocks.ts', import.meta.url)

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (req, res) => {
    res.status(500).end()
  })
})

const endpoint = () => {
  return httpServer.http.url('/graphql')
}

test.beforeEach(async () => {
  await httpServer.listen()
})

test.afterEach(async () => {
  await httpServer.close()
})

test('matches requests when the predicate function returns true', async ({
  loadExample,
  query,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  const res = await query(endpoint(), {
    query: gql`
      query GetUserDetail($id: String!) {
        user(id: $id) {
          firstName
          lastName
        }
      }
    `,
    variables: {
      id: 'abc-123',
    },
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('does not match requests when the predicate function returns false', async ({
  loadExample,
  query,
}) => {
  await loadExample(PREDICATE_EXAMPLE)

  const res = await query(endpoint(), {
    query: gql`
      query GetUserDetail($id: String!) {
        user(id: $id) {
          firstName
          lastName
        }
      }
    `,
    variables: {
      id: 'abc-1234',
    },
  })

  expect(res.status()).toBe(500)
})
