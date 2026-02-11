/**
 * @vitest-environment node
 * Example of mocking batched GraphQL queries via "batched-execute".
 * @see https://github.com/mswjs/msw/issues/510
 * @see https://the-guild.dev/graphql/stitching/handbook/appendices/batching-arrays-and-queries
 */
import {
  buildSchema,
  graphql as executeGraphQL,
  print,
  defaultFieldResolver,
} from 'graphql'
import { http, HttpResponse, GraphQLVariables, bypass } from 'msw'
import { setupServer } from 'msw/node'
import { HttpServer } from '@open-draft/test-server/http'
import { createGraphQLClient } from '../../support/graphql'

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (req, res) => {
    res.json({
      data: {
        server: { url: httpServer.http.address.href },
      },
    })
  })
})

const schema = buildSchema(`
  type User {
    id: ID!
  }

  type Product {
    name: String!
  }

  type Server {
    url: String!
  }

  type Query {
    user: User
    product: Product
    server: Server
  }
`)

const server = setupServer()

beforeAll(async () => {
  await httpServer.listen()

  server.listen()
  server.use(
    http.post<never, { query: string; variables?: GraphQLVariables }>(
      httpServer.http.url('/graphql'),
      async ({ request }) => {
        const data = await request.json()

        // "batched-execute" produces a standard-compliant GraphQL query
        // so you can resolve it against the mocked schema as-is!
        const result = await executeGraphQL({
          source: data.query,
          variableValues: data.variables,
          schema,
          rootValue: {
            // Since "batched-execute" produces a single query
            // with individual queries as fields, you have to
            // go with a field-based mocking.
            user: () => ({ id: 'abc-123' }),
            product: () => ({ name: 'Hoover 2000' }),
          },
          async fieldResolver(source, args, context, info) {
            // Resolve known fields in "rootValue" as usual.
            if (source[info.fieldName]) {
              return defaultFieldResolver(source, args, context, info)
            }

            // Proxy the unknown fields to the actual GraphQL server.
            const compiledQuery = info.fieldNodes
              .map((node) => print(node))
              .join('\n')

            const query = `${info.operation.operation} { ${compiledQuery} }`
            const queryRequest = new Request(request, {
              body: JSON.stringify({ query }),
            })
            const response = await fetch(bypass(queryRequest))
            const { error, data } = await response.json()

            if (error) {
              throw error
            }

            return data[info.fieldName]
          },
        })

        return HttpResponse.json(result)
      },
    ),
  )
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

it('sends a mocked response to a batched GraphQL query', async () => {
  const client = createGraphQLClient({
    uri: httpServer.http.url('/graphql'),
  })

  const result = await client({
    query: `
      query {
        user_0: user {
          id
        }
        product_0: product {
          name
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({
    user_0: { id: 'abc-123' },
    product_0: { name: 'Hoover 2000' },
  })
  expect.soft(result.errors).toBeUndefined()
})

it('combines mocked and original responses in a single batched query', async () => {
  const client = createGraphQLClient({
    uri: httpServer.http.url('/graphql'),
  })

  const result = await client({
    query: `
      query {
        user_0: user {
          id
        }
        server_0: server {
          url
        }
      }
    `,
  })

  expect.soft(result.data).toEqual({
    user_0: { id: 'abc-123' },
    server_0: { url: httpServer.http.address.href },
  })
  expect.soft(result.errors).toEqual(undefined)
})
