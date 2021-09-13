import * as path from 'path'
import { pageWith } from 'page-with'
import {
  GRAPHQL_TEST_URL,
  executeGraphQLQuery,
} from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'mutation.mocks.ts'),
  })
}

test('sends a mocked response to a GraphQL mutation', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
      mutation Logout {
        logout {
          userSession
        }
      }
    `,
  })
  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      logout: {
        userSession: false,
      },
    },
  })
})

test('prints a warning when captured an unnamed GraphQL mutation', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
      mutation {
        logout {
          userSession
        }
      }
    `,
  })

  expect(runtime.consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${GRAPHQL_TEST_URL}": unnamed GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation\
`,
      ),
    ]),
  )

  expect(res.status).toBeUndefined()
  expect(runtime.consoleSpy.get('error')).toEqual([
    'Failed to load resource: net::ERR_FAILED',
  ])
})
