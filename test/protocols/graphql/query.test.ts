import { HttpResponse } from 'msw'
import { graphql } from 'msw/graphql'
import { defineNetwork, expect } from '../../setup/vitest-helpers'
import { gql } from '../../support/graphql'

const api = graphql.link('*')

interface GetUserDetailQuery {
  user: {
    firstName: string
    lastName: string
  }
}

const handlers = [
  api.query<GetUserDetailQuery>('GetUserDetail', () => {
    return HttpResponse.json({
      data: {
        user: {
          firstName: 'John',
          lastName: 'Maverick',
        },
      },
    })
  }),
]

const test = defineNetwork({ handlers })

test('mocks a GraphQL query issued with a GET request', async ({
  query,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/query/graphql')

  const res = await query(endpointUrl, {
    method: 'GET',
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
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
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('mocks a GraphQL query issued with a POST request', async ({
  query,
  testServer,
}) => {
  const endpointUrl = testServer.http.url('/query/graphql')

  const res = await query(endpointUrl, {
    method: 'POST',
    query: gql`
      query GetUserDetail {
        user {
          firstName
          lastName
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
      user: {
        firstName: 'John',
        lastName: 'Maverick',
      },
    },
  })
})

test('prints a warning when intercepted an anonymous GraphQL query', async ({
  spyOnConsole,
  query,
  testServer,
}) => {
  const consoleSpy = spyOnConsole()
  const endpointUrl = testServer.http.url('/query/graphql')

  const res = await query(endpointUrl, {
    query: gql`
      query {
        user {
          firstName
        }
      }
    `,
  })

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        `\
[MSW] Failed to intercept a GraphQL request at "POST ${endpointUrl}": anonymous GraphQL operations are not supported.

Consider naming this operation or using the "operation()" request handler of "graphql.link()" to intercept GraphQL requests regardless of their operation name/type. Read more: https://mswjs.io/docs/api/graphql/#graphqloperationresolver`,
      ),
    ]),
  )

  // The actual GraphQL server is hit.
  expect(res.status()).toBe(405)
})
