import { HttpServer } from '@open-draft/test-server/lib/http.js'
import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./mutation.mocks.ts', import.meta.url)

const server = new HttpServer((app) => {
  app.use('*', (req, res) => res.status(405).end())
})

function endpoint(): string {
  return server.http.url('/graphql')
}

test.beforeEach(async () => {
  await server.listen()
})

test.afterEach(async () => {
  await server.close()
})

test('sends a mocked response to a GraphQL mutation', async ({
  loadExample,
  query,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await query(endpoint(), {
    query: /* GraphQL */ `
      mutation Logout {
        logout {
          userSession
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
      logout: {
        userSession: false,
      },
    },
  })
})

test('prints a warning when intercepted an anonymous GraphQL mutation', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(EXAMPLE_PATH)

  const res = await query(endpoint(), {
    query: /* GraphQL */ `
      mutation {
        logout {
          userSession
        }
      }
    `,
  })

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${endpoint()}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver\
`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
