// @vitest-environment node
/**
 * Example of mocking batched GraphQL queries via Apollo.
 * @see https://github.com/mswjs/msw/issues/510
 * @see https://www.apollographql.com/docs/router/executing-operations/query-batching
 */
import { http, bypass, HttpResponse, getResponse, RequestHandler } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

/**
 * A higher-order request handler function that resolves any
 * batched GraphQL queries to the given URL against the list
 * of request handlers.
 */
function batchedGraphQLQuery(url: string, handlers: Array<RequestHandler>) {
  return http.post(url, async ({ request }) => {
    const data = await request.json()

    // Ignore GraphQL queries that are not batched queries.
    if (!Array.isArray(data)) {
      return
    }

    const responses = await Promise.all(
      // Resolve each individual query against the existing
      // array of GraphQL request handlers.
      data.map(async (operation) => {
        const scopedRequest = new Request(request, {
          body: JSON.stringify(operation),
        })
        const response = await getResponse(handlers, scopedRequest)
        return response || fetch(bypass(scopedRequest))
      }),
    )

    // Read the mocked response JSON bodies to use
    // in the response to the entire batched query.
    const queryData = await Promise.all(
      responses.map((response) => response?.json()),
    )

    return HttpResponse.json(queryData)
  })
}

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')

const graphqlHandlers = [
  api.query('GetUser', () => {
    return HttpResponse.json({
      data: {
        user: { id: 1 },
      },
    })
  }),
  api.query('GetProduct', () => {
    return HttpResponse.json({
      data: {
        product: { name: 'Hoover 2000' },
      },
    })
  }),
]

const server = setupServer(...graphqlHandlers)

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('sends a mocked response to a batched GraphQL query', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return Response.json({
          data: {
            server: { url: httpServer.http.url().href },
          },
        })
      })
    },
  })

  /**
   * @note This handler doesn't have to be a runtime handler.
   * This is a prerequisite of how MSW spawns a test server
   * for this particular test. Move it to the top of the rest
   * of your request handlers.
   */
  server.use(
    batchedGraphQLQuery(httpServer.http.url('/graphql').href, graphqlHandlers),
  )

  const response = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        query: `
          query GetUser {
            user {
              id
            }
          }
        `,
      },
      {
        query: `
          query GetProduct {
            product {
              name
            }
          }
        `,
      },
    ]),
  })

  await expect(response.json()).resolves.toEqual([
    {
      data: { user: { id: 1 } },
    },
    {
      data: { product: { name: 'Hoover 2000' } },
    },
  ])
})

test('combines mocked and original responses in a single batched query', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', () => {
        return Response.json({
          data: {
            server: { url: httpServer.http.url().href },
          },
        })
      })
    },
  })

  server.use(
    batchedGraphQLQuery(httpServer.http.url('/graphql').href, graphqlHandlers),
  )

  const response = await fetch(httpServer.http.url('/graphql'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([
      {
        query: `
          query GetUser {
            user {
              id
            }
          }
        `,
      },
      {
        query: `
          query UnmockedQuery {
            server {
              url
            }
          }
        `,
      },
    ]),
  })

  await expect(response.json()).resolves.toEqual([
    {
      data: { user: { id: 1 } },
    },
    {
      data: { server: { url: httpServer.http.url().href } },
    },
  ])
})
