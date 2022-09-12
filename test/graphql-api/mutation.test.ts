import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../support/graphql'

const MUTATION_EXAMPLE = require.resolve('./mutation.mocks.ts')

const server = new HttpServer((app) => {
  app.use('*', (req, res) => res.status(405).end())
})

function endpoint(): string {
  return server.http.url('/graphql')
}

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('sends a mocked response to a GraphQL mutation', async ({
  loadExample,
  query,
}) => {
  await loadExample(MUTATION_EXAMPLE)

  const res = await query(endpoint(), {
    query: gql`
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

test('prints a warning when captured an anonymous GraphQL mutation', async ({
  loadExample,
  spyOnConsole,
  query,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(MUTATION_EXAMPLE)

  const res = await query(endpoint(), {
    query: gql`
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

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation\
`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
