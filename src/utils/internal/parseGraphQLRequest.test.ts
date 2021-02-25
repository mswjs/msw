import { Headers } from 'headers-utils/lib'
import { createMockedRequest } from '../../../test/support/utils'
import { parseGraphQLRequest } from './parseGraphQLRequest'

test('returns true given a GraphQL-compatible request', () => {
  const getRequest = createMockedRequest({
    method: 'GET',
    url: new URL(
      'http://localhost:8080/graphql?query=mutation Login { user { id } }',
    ),
    headers: new Headers({ 'content-type': 'application/json' }),
  })
  expect(parseGraphQLRequest(getRequest)).toEqual({
    operationType: 'mutation',
    operationName: 'Login',
  })

  const postRequest = createMockedRequest({
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {
      query: `query GetUser { user { firstName } }`,
    },
  })
  expect(parseGraphQLRequest(postRequest)).toEqual({
    operationType: 'query',
    operationName: 'GetUser',
  })
})

test('returns false given a GraphQL-incompatible request', () => {
  const getRequest = createMockedRequest({
    method: 'GET',
    url: new URL('http://localhost:8080/query'),
    headers: new Headers({ 'content-type': 'application/json' }),
  })
  expect(parseGraphQLRequest(getRequest)).toBeUndefined()

  const postRequest = createMockedRequest({
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {
      queryUser: true,
    },
  })
  expect(parseGraphQLRequest(postRequest)).toBeUndefined()
})
