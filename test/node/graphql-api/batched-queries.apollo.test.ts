/**
 * @vitest-environment node
 * Example of mocking batched GraphQL queries via Apollo.
 * @see https://github.com/mswjs/msw/issues/510
 * @see https://www.apollographql.com/docs/router/executing-operations/query-batching
 */
import { http, graphql, HttpResponse, getResponse, RequestHandler } from 'msw'
import { setupServer } from 'msw/node'

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

        return getResponse({
          request: scopedRequest,
          handlers,
        })
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

const graphqlHandlers = [
  graphql.query('GetUser', () => {
    return HttpResponse.json({
      data: {
        user: { id: 1 },
      },
    })
  }),
  graphql.query('GetProduct', () => {
    return HttpResponse.json({
      data: {
        product: { name: 'Hoover 2000' },
      },
    })
  }),
]

const handlers = [
  batchedGraphQLQuery('http://localhost/graphql', graphqlHandlers),
  ...graphqlHandlers,
]

const server = setupServer(...handlers)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('sends a mocked response to a batched GraphQL query', async () => {
  const response = await fetch('http://localhost/graphql', {
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

  expect(await response.json()).toEqual([
    {
      data: { user: { id: 1 } },
    },
    {
      data: { product: { name: 'Hoover 2000' } },
    },
  ])
})
