import * as path from 'path'
import { buildSchema, graphql } from 'graphql'
import { ApolloQueryResult } from '@apollo/client'
import { ServerApi, createServer } from '@open-draft/test-server'
import { SetupWorkerApi } from 'msw'
import { runBrowserWith } from '../support/runBrowserWith'

declare namespace window {
  export const dispatchGraphQLQUery: (
    uri: string,
  ) => Promise<ApolloQueryResult<any>>

  export const msw: {
    registration: SetupWorkerApi['start']
  }
}

let prodServer: ServerApi

beforeAll(async () => {
  // This test server simulates a production GraphQL server
  // and uses a hard-coded `rootValue` to resolve queries
  // against the schema.
  prodServer = await createServer((app) => {
    app.post('/graphql', async (req, res) => {
      const result = await graphql({
        schema: buildSchema(`
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
})

afterAll(async () => {
  await prodServer.close()
})

function createRuntime() {
  return runBrowserWith(path.join(__dirname, 'response-patching.mocks.ts'))
}

test('patches a GraphQL response', async () => {
  const runtime = await createRuntime()
  const prodServerUrl = prodServer.http.makeUrl('/graphql')

  await runtime.page.evaluate(() => {
    return window.msw.registration
  })

  const res = await runtime.page.evaluate(
    (url) => {
      return window.dispatchGraphQLQUery(url)
    },
    [prodServerUrl],
  )

  expect(res.errors).toBeUndefined()
  expect(res.data).toHaveProperty('user', {
    firstName: 'Christian',
    lastName: 'Maverick',
  })

  return runtime.cleanup()
})
