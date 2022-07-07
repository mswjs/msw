/**
 * @jest-environment jsdom
 */
import { Headers } from 'headers-polyfill'
import { MockedRequest } from '../request/MockedRequest'
import { parseGraphQLRequest } from './parseGraphQLRequest'

test('returns true given a GraphQL-compatible request', () => {
  const getRequest = new MockedRequest(
    new URL(
      'http://localhost:8080/graphql?query=mutation Login { user { id } }',
    ),
  )
  expect(parseGraphQLRequest(getRequest)).toEqual({
    operationType: 'mutation',
    operationName: 'Login',
  })

  const postRequest = new MockedRequest(
    new URL('http://localhost:8080/graphql'),
    {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: {
        query: `query GetUser { user { firstName } }`,
      },
    },
  )

  expect(parseGraphQLRequest(postRequest)).toEqual({
    operationType: 'query',
    operationName: 'GetUser',
  })
})

test('throws an exception given an invalid GraphQL request', () => {
  const getRequest = new MockedRequest(
    new URL('http://localhost:8080/graphql?query=mutation Login() { user { {}'),
  )
  expect(() => parseGraphQLRequest(getRequest)).toThrowError(
    '[MSW] Failed to intercept a GraphQL request to "GET http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.',
  )

  const postRequest = new MockedRequest(
    new URL('http://localhost:8080/graphql'),
    {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: {
        query: `query GetUser() { user {{}`,
      },
    },
  )
  expect(() => parseGraphQLRequest(postRequest)).toThrowError(
    '[MSW] Failed to intercept a GraphQL request to "POST http://localhost:8080/graphql": cannot parse query. See the error message from the parser below.\n\nSyntax Error: Expected "$", found ")".',
  )
})

test('returns false given a GraphQL-incompatible request', () => {
  const getRequest = new MockedRequest(
    new URL('http://localhost:8080/graphql'),
    {
      headers: new Headers({ 'Content-Type': 'application/json' }),
    },
  )
  expect(parseGraphQLRequest(getRequest)).toBeUndefined()

  const postRequest = new MockedRequest(
    new URL('http://localhost:8080/graphql'),
    {
      method: 'POST',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      body: {
        queryUser: true,
      },
    },
  )
  expect(parseGraphQLRequest(postRequest)).toBeUndefined()
})
