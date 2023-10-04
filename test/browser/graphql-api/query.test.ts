import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

const EXAMPLE_PATH = require.resolve('./query.mocks.ts')

const server = new HttpServer((app) => {
  app.use('*', (_, res) => res.status(405).end())
})

const endpoint = () => {
  return server.http.url('/graphql')
}

test.beforeEach(async () => {
  await server.listen()
})

test.afterEach(async () => {
  await server.close()
})

test('mocks a GraphQL query issued with a GET request', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await query(endpoint(), {
    method: 'GET',
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('mocks a GraphQL query issued with a POST request', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await query(endpoint(), {
    method: 'POST',
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('prints a warning when intercepted an anonymous GraphQL query', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_PATH)

  const res = await query(endpoint(), {
    query: gql`
      query {
        user {
          firstName
        }
      }
    `,
  })

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${endpoint()}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
