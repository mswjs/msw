/**
 * @vitest-environment node
 * Example of mocking batched GraphQL queries via Apollo.
 * @see https://github.com/mswjs/msw/issues/510
 * @see https://www.apollographql.com/docs/router/executing-operations/query-batching
 */
import { http, graphql, HttpResponse, executeHandlers } from 'msw'
import { setupServer } from 'msw/node'

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

export const handlers = [
  // Let's create a request handler for batched GraphQL requests
  // made using Apollo.
  http.post('http://localhost/graphql', async ({ request, requestId }) => {
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

        const result = await executeHandlers({
          request: scopedRequest,
          requestId,
          handlers: graphqlHandlers,
        })

        return result?.response
      }),
    )

    // Read the mocked response JSON bodies to use
    // in the response to the entire batched query.
    const queryData = await Promise.all(
      responses.map((response) => response?.json()),
    )

    return HttpResponse.json(queryData)
  }),
]

const server = setupServer(...handlers, ...graphqlHandlers)

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
