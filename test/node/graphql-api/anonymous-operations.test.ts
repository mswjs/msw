// @vitest-environment node
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse, graphql } from 'msw'
import { setupServer } from 'msw/node'
import { createGraphQLClient } from '../../support/graphql'

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
  vi.clearAllMocks()
})

afterAll(async () => {
  vi.restoreAllMocks()
  server.close()
  await httpServer.close()
})

it('warns on unhandled anonymous GraphQL operations', async () => {
  const endpointUrl = httpServer.http.url('/graphql')
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

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`)
})

it('does not print a warning when using anonymous operation with "graphql.operation()"', async () => {
  server.use(
    graphql.operation(async () => {
      return HttpResponse.json({
        data: {
          pets: [{ name: 'Tom' }, { name: 'Jerry' }],
        },
      })
    }),
  )

  const endpointUrl = httpServer.http.url('/graphql')
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
