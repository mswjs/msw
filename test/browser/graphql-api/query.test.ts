import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./query.mocks.ts', import.meta.url)

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

  const response = await query(endpoint(), {
    method: 'GET',
    query: /* GraphQL */ `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toHaveProperty(
    'content-type',
    'application/json',
  )
  await expect(response.json()).resolves.toEqual({
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

  const response = await query(endpoint(), {
    method: 'POST',
    query: /* GraphQL */ `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  expect(response.status()).toBe(200)
  await expect(response.allHeaders()).resolves.toHaveProperty(
    'content-type',
    'application/json',
  )
  await expect(response.json()).resolves.toEqual({
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

  const response = await query(endpoint(), {
    query: /* GraphQL */ `
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

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(response.status()).toBe(405)
})
