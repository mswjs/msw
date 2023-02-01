import type { ExecutionResult } from 'graphql'
import { buildSchema, graphql } from 'graphql'
import { SetupWorkerApi } from 'msw'
import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'

declare namespace window {
  export const dispatchGraphQLQuery: (uri: string) => Promise<ExecutionResult>
  export const msw: {
    registration: SetupWorkerApi['start']
  }
}

// This test server simulates a production GraphQL server
// and uses a hard-coded `rootValue` to resolve queries
// against the schema.
const httpServer = new HttpServer((app) => {
  app.post('/graphql', async (req, res) => {
    const result = await graphql({
      schema: buildSchema(gql`
        type User {
          firstName: String!
          lastName: String!
        }

        type Query {
          user: User!
        }
      `),
      source: req.body.query,
      rootValue: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })

    return res.status(200).json(result)
  })
})

test.beforeAll(async () => {
  await httpServer.listen()
})

test.afterAll(async () => {
  await httpServer.close()
})

test('patches a GraphQL response', async ({ loadExample, page, query }) => {
  await loadExample(require.resolve('./response-patching.mocks.ts'))
  const endpointUrl = httpServer.http.url('/graphql')

  await page.evaluate(() => {
    return window.msw.registration
  })

  const res = await query(endpointUrl, {
    query: gql`
      query GetUser {
        user {
          firstName
          lastName
        }
      }
    `,
  })
  const body = await res.json()

  expect(body).toEqual({
    data: {
      user: {
        firstName: 'Christian',
        lastName: 'Maverick',
      },
    },
  })
})
