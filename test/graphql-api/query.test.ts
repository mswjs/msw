import * as path from 'path'
import { pageWith } from 'page-with'
import {
  GRAPHQL_TEST_URL,
  executeGraphQLQuery,
} from './utils/executeGraphQLQuery'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'query.mocks.ts'),
  })
}

test('mocks a GraphQL query issued with a GET request', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: `
      query GetUserDetail {
        user {
          firstName
          lastName
        }
      }
    `,
    },
    {
      method: 'GET',
    },
  )

  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toEqual(200)
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

test('mocks a GraphQL query issued with a POST request', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
      query GetUserDetail {
        user {
          firstName
          lastName
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
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('prints a warning when captured an anonymous GraphQL query', async () => {
  const runtime = await createRuntime()

  const res = await executeGraphQLQuery(runtime.page, {
    query: `
      query {
        user {
          firstName
        }
      }
    `,
  })

  expect(runtime.consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${GRAPHQL_TEST_URL}": anonymous GraphQL operations are not supported.

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
