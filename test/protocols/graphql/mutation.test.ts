import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

interface LogoutQuery {
  logout: {
    userSession: boolean
  }
}

const handlers = [
  api.mutation<LogoutQuery>('Logout', () => {
    return HttpResponse.json({
      data: {
        logout: {
          userSession: false,
        },
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('sends a mocked response to a GraphQL mutation', async ({
  query,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/mutation/graphql')

  const res = await query(endpointUrl, {
    query: gql`
      mutation Logout {
        logout {
          userSession
        }
      }
    `,
  })
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(body).toEqual({
    data: {
      logout: {
        userSession: false,
      },
    },
  })
})

test('prints a warning when intercepted an anonymous GraphQL mutation', async ({
  spyOnConsole,
  query,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const endpointUrl = testServer.http.url('/mutation/graphql')

  const res = await query(endpointUrl, {
    query: gql`
      mutation {
        logout {
          userSession
        }
      }
    `,
  })

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using the "operation()" request handler of "graphql.link()" to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver\
`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
