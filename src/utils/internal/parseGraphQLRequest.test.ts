import { Headers } from 'headers-utils'
import { createMockedRequest } from '../../../test/support/utils'
import { parseGraphQLRequest } from './parseGraphQLRequest'

test('returns true given a GraphQL-compatible request', () => {
  const getRequest = createMockedRequest({
    method: 'GET',
    url: new URL(
      'http://localhost:8080/graphql?query=mutation Login { user { id } }',
    ),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
  expect(parseGraphQLRequest(getRequest)).toEqual({
    operationType: 'mutation',
    operationName: 'Login',
  })

  const postRequest = createMockedRequest({
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: {
      query: `query GetUser { user { firstName } }`,
    },
  })
  expect(parseGraphQLRequest(postRequest)).toEqual({
    operationType: 'query',
    operationName: 'GetUser',
  })
})

test('throws an exception given an invalid GraphQL request', () => {
  const getRequest = createMockedRequest({
    method: 'GET',
    url: new URL(
      'http://localhost:8080/graphql?query=mutation Login() { user { {}',
    ),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  })
  expect(() => parseGraphQLRequest(getRequest)).toThrowError(
    '[MSW] Failed to intercept a GraphQL request to "GET http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.',
  )

  const postRequest = createMockedRequest({
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
    body: {
      query: `query GetUser() { user {{}`,
    },
  })
  expect(() => parseGraphQLRequest(postRequest)).toThrowError(
    '[MSW] Failed to intercept a GraphQL request to "POST http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.\n\nSyntax Error: Expected "$", found ")".',
  )
})

test('returns false given a GraphQL-incompatible request', () => {
  const getRequest = createMockedRequest({
    method: 'GET',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'Content-Type': 'application/json' }),
  })
  expect(parseGraphQLRequest(getRequest)).toBeUndefined()

  const postRequest = createMockedRequest({
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: {
      queryUser: true,
    },
  })
  expect(parseGraphQLRequest(postRequest)).toBeUndefined()
})
