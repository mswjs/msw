import type { ExecutionResult } from 'graphql'
import { buildSchema, graphql } from 'graphql'
import { SetupWorkerApi } from 'msw/browser'
import { HttpServer } from '@open-draft/test-server/lib/http.js'
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

test.beforeEach(async () => {
  await httpServer.listen()
})

test.afterEach(async () => {
  await httpServer.close()
})

test('patches a GraphQL response', async ({ loadExample, page }) => {
  await loadExample(new URL('./response-patching.mocks.ts', import.meta.url))
  const endpointUrl = httpServer.http.url('/graphql')

  await page.evaluate(() => {
    return window.msw.registration
  })

  const res = await page.evaluate(
    ([url]) => {
      return window.dispatchGraphQLQuery(url)
    },
    [endpointUrl],
  )

  expect(res.errors).toBeUndefined()
  expect(res.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })
})
