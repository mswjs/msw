import { HttpServer } from '@open-draft/test-server/http'
import { test, expect } from '../playwright.extend'
import { gql } from '../../support/graphql'
import { waitFor } from '../../support/waitFor'

declare namespace window {
  export const msw: {
    worker: import('msw/browser').SetupWorkerApi
    graphql: typeof import('msw').graphql
    HttpResponse: typeof import('msw').HttpResponse
  }
}

const httpServer = new HttpServer((app) => {
  app.post('/graphql', (req, res) => {
    res.json({
      data: {
        user: {
          id: 'abc-123',
        },
      },
    })
  })
})

test.beforeAll(async () => {
  await httpServer.listen()
})

test.afterAll(async () => {
  await httpServer.close()
})

test('does not warn on anonymous GraphQL operation when no GraphQL handlers are present', async ({
  loadExample,
  query,
  spyOnConsole,
}) => {
  await loadExample(require.resolve('./anonymous-operation.mocks.ts'))
  const consoleSpy = spyOnConsole()

  const endpointUrl = httpServer.http.url('/graphql')
  const response = await query(endpointUrl, {
    query: gql`
      # Intentionally anonymous query.
      query {
        user {
          id
        }
      }
    `,
  })

  const json = await response.json()

  // Must get the original server response.
  expect(json).toEqual({
    data: {
      user: {
        id: 'abc-123',
      },
    },
  })

  await waitFor(() => {
    // Must print a generic unhandled GraphQL request warning.
    // This has nothing to do with the operation being anonymous.
    expect(consoleSpy.get('warning')).toEqual([
      `\
[MSW] Warning: intercepted a request without a matching request handler:

  • anonymous query (POST ${endpointUrl})

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`,
    ])
  })

  //   // Must print the warning because anonymous operations cannot be intercepted
  //   // using standard "graphql.query()" and "graphql.mutation()" handlers.
  //   await waitFor(() => {
  //     expect(consoleSpy.get('warning')).toEqual(
  //       expect.arrayContaining([
  //         `[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

  // Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation`,
  //       ]),
  //     )
  //   })
})

test('warns on handled anonymous GraphQL operation', async ({
  loadExample,
  query,
  spyOnConsole,
  page,
}) => {
  await loadExample(require.resolve('./anonymous-operation.mocks.ts'))
  const consoleSpy = spyOnConsole()

  await page.evaluate(() => {
    const { worker, graphql, HttpResponse } = window.msw

    worker.use(
      // This handler will have no effect on the anonymous operation performed.
      graphql.query('IrrelevantQuery', () => {
        return HttpResponse.json({
          data: {
            user: {
              id: 'mocked-123',
            },
          },
        })
      }),
    )
  })

  const endpointUrl = httpServer.http.url('/graphql')
  const response = await query(endpointUrl, {
    query: gql`
      # Intentionally anonymous query.
      # It will be handled in the "graphql.operation()" handler above.
      query {
        user {
          id
        }
      }
    `,
  })

  const json = await response.json()

  // Must get the original response because the "graphql.query()"
  // handler won't match an anonymous GraphQL operation.
  expect(json).toEqual({
    data: {
      user: {
        id: 'abc-123',
      },
    },
  })

  // Must print the warning because an anonymous operation has been performed.
  await waitFor(() => {
    expect(consoleSpy.get('warning')).toEqual(
      expect.arrayContaining([
        `[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using "graphql.operation()" request handler to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/operation`,
      ]),
    )
  })
})

test('does not print a warning on anonymous GraphQL operation handled by "graphql.operation()"', async ({
  loadExample,
  spyOnConsole,
  page,
  query,
}) => {
  await loadExample(require.resolve('./anonymous-operation.mocks.ts'))
  const consoleSpy = spyOnConsole()

  await page.evaluate(() => {
    const { worker, graphql, HttpResponse } = window.msw

    worker.use(
      // This handler will match ANY anonymous GraphQL operation.
      // It's a good idea to include some matching logic to differentiate
      // between those operations. We're omitting it for testing purposes.
      graphql.operation(() => {
        return HttpResponse.json({
          data: {
            user: {
              id: 'mocked-123',
            },
          },
        })
      }),
    )
  })

  const endpointUrl = httpServer.http.url('/graphql')
  const response = await query(endpointUrl, {
    query: gql`
      # Intentionally anonymous query.
      # It will be handled in the "graphql.operation()" handler above.
      query {
        user {
          id
        }
      }
    `,
  })

  const json = await response.json()

  // Must get the mocked response.
  expect(json).toEqual({
    data: {
      user: {
        id: 'mocked-123',
      },
    },
  })

  // Must not print any warnings because a permissive "graphql.operation()"
  // handler was used to intercept and mock the anonymous GraphQL operation.
  expect(consoleSpy.get('warning')).toBeUndefined()
})
