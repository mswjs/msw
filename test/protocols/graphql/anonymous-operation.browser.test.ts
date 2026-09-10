import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const test = defineNetwork()

test('does not warn on anonymous GraphQL operation when no GraphQL handlers are present', async ({
  query,
  spyOnConsole,
  testServer,
  network,
}) => {
  const consoleSpy = spyOnConsole()

  if (!('start' in network)) {
    throw new Error('Expected a browser network instance')
  }

  await network.stop()
  await network.start({ onUnhandledRequest: 'warn' })

  const endpointUrl = testServer.http.url('/anonymous/graphql')
  const response = await query(endpointUrl, {
    // Intentionally anonymous query.
    query: gql`
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

  // Must print a generic unhandled GraphQL request warning.
  // This has nothing to do with the operation being anonymous.
  await expect
    .poll(() => consoleSpy.get('warning'))
    .toEqual([
      `\
[MSW] Warning: intercepted a request without a matching request handler:

  • POST ${endpointUrl}

  • Request body: {"query":"\\n      query {\\n        user {\\n          id\\n        }\\n      }\\n    "}

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`,
    ])
})

test('warns on handled anonymous GraphQL operation', async ({
  query,
  spyOnConsole,
  testServer,
  network,
}) => {
  const consoleSpy = spyOnConsole()

  const endpointUrl = testServer.http.url('/anonymous/graphql')

  const api = graphql.link(endpointUrl.href)
  network.use(
    // This handler will have no effect on the anonymous operation performed.
    api.query('IrrelevantQuery', () => {
      return HttpResponse.json({
        data: {
          user: {
            id: 'mocked-123',
          },
        },
      })
    }),
  )

  const response = await query(endpointUrl, {
    // Intentionally anonymous query.
    query: gql`
      query {
        user {
          id
        }
      }
    `,
  })

  const json = await response.json()

  // Must get the original response because the "query()"
  // handler won't match an anonymous GraphQL operation.
  expect(json).toEqual({
    data: {
      user: {
        id: 'abc-123',
      },
    },
  })

  // Must print the warning because an anonymous operation has been performed.
  await expect
    .poll(() => consoleSpy.get('warning'))
    .toEqual(
      expect.arrayContaining([
        `[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using the "operation()" request handler of "graphql.link()" to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`,
      ]),
    )
})

test('does not print a warning on anonymous GraphQL operation handled by the "operation()" link handler', async ({
  spyOnConsole,
  query,
  testServer,
  network,
}) => {
  const consoleSpy = spyOnConsole()

  const endpointUrl = testServer.http.url('/anonymous/graphql')

  const api = graphql.link(endpointUrl.href)
  network.use(
    // This handler will match ANY anonymous GraphQL operation.
    // It's a good idea to include some matching logic to differentiate
    // between those operations. We're omitting it for testing purposes.
    api.operation(() => {
      return HttpResponse.json({
        data: {
          user: {
            id: 'mocked-123',
          },
        },
      })
    }),
  )

  const response = await query(endpointUrl, {
    // Intentionally anonymous query.
    // It will be handled in the "operation()" handler above.
    query: gql`
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

  // Must not print any warnings because a permissive "operation()"
  // handler was used to intercept and mock the anonymous GraphQL operation.
  expect(consoleSpy.get('warning')).toBeUndefined()
})
