// @vitest-environment node
import { HttpServer } from '@open-draft/test-server/http'
import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
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

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')

const server = setupServer(api.query('GetUser', () => {}))

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

Consider naming this operation or using the "operation()" request handler of "graphql.link()" to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`)
})

it('does not print a warning when using anonymous operation with the "operation()" link handler', async () => {
  server.use(
    api.operation(async () => {
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
