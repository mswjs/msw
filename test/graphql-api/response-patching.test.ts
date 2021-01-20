import { graphql } from 'msw'
import { setupServer } from 'msw/node'
import { graphql as executeGraphql } from 'graphql'
import { buildSchema } from 'graphql/utilities'
import { createApolloFetch } from 'apollo-fetch'
import { ServerApi, createServer } from '@open-draft/test-server'

let prodServer: ServerApi

const server = setupServer(
  graphql.query('GetUser', async (req, res, ctx) => {
    const originalResponse = await ctx.fetch(req)
    const { requestHeaders, queryResult } = await originalResponse.json()

    return res(
      ctx.data({
        user: {
          firstName: 'Christian',
          lastName: queryResult.data?.user?.lastName,
        },
        // Setting the request headers on the response data on purpose
        // to access them in the response of the Apollo client.
        requestHeaders,
      }),
      ctx.errors(queryResult.errors),
    )
  }),
)

beforeAll(async () => {
  server.listen()

  // This test server acts as a production server MSW will be hitting
  // when performing a request patching with `ctx.fetch()`.
  prodServer = await createServer((app) => {
    app.post('/graphql', async (req, res) => {
      const result = await executeGraphql({
        schema: buildSchema(`
          type User {
            firstName: String!
            lastName: String!
          }

          type Query {
            user: User!
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
})

afterAll(async () => {
  server.close()
  await prodServer.close()
})

test('patches a GraphQL response', async () => {
  const fetch = createApolloFetch({
    uri: prodServer.http.makeUrl('/graphql'),
  })

  const res = await fetch({
    query: `
      query GetUser {
        user {
          firstName
          lastName
        }
      }
    `,
  })

  expect(res.errors).toBeUndefined()
  expect(res.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })
  expect(res.data.requestHeaders).toHaveProperty('x-msw-bypass', 'true')
  expect(res.data.requestHeaders).not.toHaveProperty('map')
})
