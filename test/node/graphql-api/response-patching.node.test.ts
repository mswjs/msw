// @vitest-environment node
import { bypass, graphql, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { HttpServer } from '@open-draft/test-server/http'
import { createGraphQLClient, gql } from '../../support/graphql'

const server = setupServer(
  graphql.query('GetUser', async ({ request }) => {
    const originalResponse = await fetch(bypass(request))
    const { requestHeaders, queryResult } = await originalResponse.json()

    return HttpResponse.json({
      data: {
        user: {
          firstName: 'Christian',
          lastName: queryResult.data?.user?.lastName,
        },
        // Setting the request headers on the response data on purpose
        // to access them in the response of the Apollo client.
        requestHeaders,
      },
      errors: queryResult.errors,
    })
  }),
)

const httpServer = new HttpServer((app) => {
  app.post('/graphql', async (req, res) => {
    console.log('pass:', req.headers)

    const result = await executeGraphql({
      schema: buildSchema(gql`
        type User {
          firstName: String!
          lastName: String!
        }

        # Describing an additional type to return
        # the request headers back to the request handler.
        # Apollo will strip off any extra data that
        # doesn't match the query.
        type RequestHeader {
          name: String!
          value: String!
        }

        type Query {
          user: User!
          requestHeaders: [RequestHeader!]
        }
      `),
      operationName: 'GetUser',
      source: req.body.query,
      rootValue: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })

    return res.status(200).json({
      requestHeaders: req.headers,
      queryResult: result,
    })
  })
})

beforeAll(async () => {
  server.listen()

  // This test server acts as a production server MSW will be hitting
  // when performing a request patching with `ctx.fetch()`.
  await httpServer.listen()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('patches a GraphQL response', async () => {
  const client = createGraphQLClient({
    uri: httpServer.http.url('/graphql'),
    fetch,
  })

  const res = await client<{
    user: {
      firstName: string
      lastName: string
    }
    requestHeaders: Record<string, string>
  }>({
    query: gql`
      query GetUser {
        user {
          firstName
          lastName
        }
        requestHeaders {
          name
          value
        }
      }
    `,
  })

  expect(res.errors).toBeUndefined()
  expect(res.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })
  expect(res.data?.requestHeaders).toHaveProperty('accept', '*/*')
  expect(res.data?.requestHeaders).not.toHaveProperty('_headers')
  expect(res.data?.requestHeaders).not.toHaveProperty('_names')
})
