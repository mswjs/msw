/**
 * @vitest-environment node
 */
import fetch from 'node-fetch'
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, graphql } from 'msw'
import { setupServer } from 'msw/node'

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (req, res) => {
    res.json({
      data: {
        user: { id: 'abc-123' },
      },
    })
  })
})

const server = setupServer(graphql.query('GetUser', () => {}))

beforeAll(async () => {
  server.listen()
  await httpServer.listen()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  server.resetHandlers()
  vi.resetAllMocks()
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

test('warns on unhandled anonymous GraphQL operations', async () => {
  const endpointUrl = httpServer.http.url('/graphql')
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          user {
            id
          }
        }
      `,
    }),
  })
  const json = await response.json()

  // Must receive the original server response.
  expect(json).toEqual({
    data: { user: { id: 'abc-123' } },
  })

  // Must print a warning about the anonymous GraphQL operation.
  expect(console.warn).toHaveBeenCalledWith(`\
[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`)
})

test('does not print a warning when using anonymous operation with "graphql.operation()"', async () => {
  server.use(
    graphql.operation(async ({ query, variables }) => {
      return HttpResponse.json({
        data: {
          pets: [{ name: 'Tom' }, { name: 'Jerry' }],
        },
      })
    }),
  )

  const endpointUrl = httpServer.http.url('/graphql')
  const response = await fetch(endpointUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: `
        query {
          pets {
            name
          }
        }
      `,
    }),
  })
  const json = await response.json()

  // Must get the mocked response.
  expect(json).toEqual({
    data: {
      pets: [{ name: 'Tom' }, { name: 'Jerry' }],
    },
  })

  // Must print no warnings: operation is handled and doesn't
  // have to be named since we're using "graphql.operation()".
  expect(console.warn).not.toHaveBeenCalled()
})
