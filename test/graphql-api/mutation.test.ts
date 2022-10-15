import * as path from 'path'
import { createServer, ServerApi } from '@open-draft/test-server'
import { pageWith } from 'page-with'
import { executeGraphQLQuery } from './utils/executeGraphQLQuery'
import { gql } from '../support/graphql'

function prepareRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'mutation.mocks.ts'),
  })
}

let server: ServerApi

function getEndpoint(): string {
  return server.http.makeUrl('/graphql')
}

beforeAll(async () => {
  server = await createServer((app) => {
    app.use('*', (req, res) => res.status(405).end())
  })
})

afterAll(async () => {
  await server.close()
})

test('sends a mocked response to a GraphQL mutation', async () => {
  const runtime = await prepareRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: gql`
        mutation Logout {
          logout {
            userSession
          }
        }
      `,
    },
    {
      uri: getEndpoint(),
    },
  )
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

test('prints a warning when captured an anonymous GraphQL mutation', async () => {
  const runtime = await prepareRuntime()

  const res = await executeGraphQLQuery(
    runtime.page,
    {
      query: gql`
        mutation {
          logout {
            userSession
          }
        }
      `,
    },
    {
      uri: getEndpoint(),
    },
  )

  expect(runtime.consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${getEndpoint()}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation\
`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
