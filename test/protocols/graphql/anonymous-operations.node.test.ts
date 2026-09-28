// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'
import { createGraphQLClient } from '../../support/graphql'

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')

const server = setupServer(api.query('GetUser', () => {}))

beforeAll(() => {
  server.listen()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  vi.restoreAllMocks()
  server.close()
})

test('warns on unhandled anonymous GraphQL operations', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return Response.json({
          data: {
            user: { id: 'abc-123' },
          },
        })
      })
    },
  })

  const endpointUrl = httpServer.http.url('/graphql').href
  const client = createGraphQLClient({ uri: endpointUrl })

  const result = await client({
    query: `
      query {
        user {
          id
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({
    user: { id: 'abc-123' },
  })

  expect(console.warn, 'Warns about an anonymous operation')
    .toHaveBeenCalledWith(`\
[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using the "operation()" request handler of "graphql.link()" to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`)
})

test('does not print a warning when using anonymous operation with the "operation()" link handler', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return Response.json({
          data: {
            user: { id: 'abc-123' },
          },
        })
      })
    },
  })

  server.use(
    api.operation(async () => {
      return HttpResponse.json({
        data: {
          pets: [{ name: 'Tom' }, { name: 'Jerry' }],
        },
      })
    }),
  )

  const endpointUrl = httpServer.http.url('/graphql').href
  const client = createGraphQLClient({ uri: endpointUrl })

  const result = await client({
    query: `
      query {
        pets {
          name
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({
    pets: [{ name: 'Tom' }, { name: 'Jerry' }],
  })
  expect(console.warn, 'Must not print any warnings').not.toHaveBeenCalled()
})
