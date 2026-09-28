// @vitest-environment node
import { bypass, HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { setupServer } from 'msw/node'
import { graphql as executeGraphql, buildSchema } from 'graphql'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { createGraphQLClient, gql } from '../../support/graphql'

// The test server URL is only known once it starts listening,
// so use a wildcard link to match any GraphQL endpoint.
const api = graphql.link('*')

const server = setupServer(
  api.query('GetUser', async ({ request }) => {
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

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('patches a GraphQL response', async () => {
  // This test server acts as a production server MSW will be hitting
  // when performing a request patching with `ctx.fetch()`.
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.post('/graphql', async (context) => {
        const body = await context.req.json()
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
          source: body.query,
          rootValue: {
            user: {
              firstName: 'John',
              lastName: 'Maverick',
            },
          },
        })

        return Response.json({
          requestHeaders: context.req.header(),
          queryResult: result,
        })
      })
    },
  })

  const client = createGraphQLClient({
    uri: httpServer.http.url('/graphql').href,
  })

  const response = await client<{
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

  expect(response.errors).toBeUndefined()
  expect(response.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })
  expect(response.data?.requestHeaders).toHaveProperty('accept', '*/*')
})
