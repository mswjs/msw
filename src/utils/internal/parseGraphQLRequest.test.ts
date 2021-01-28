import { Headers } from 'headers-utils/lib'
import { MockedRequest } from '../handlers/requestHandler'
import { parseGraphQLRequest } from './parseGraphQLRequest'

test('returns true given a GraphQL-compatible request', () => {
  const getRequest: MockedRequest = {
    id: 'abc-123',
    method: 'GET',
    url: new URL(
      'http://localhost:8080/graphql?query=mutation Login { user { id } }',
    ),
    headers: new Headers({ 'content-type': 'application/json' }),
    cache: 'default',
    credentials: 'same-origin',
    cookies: {},
    body: '',
    bodyUsed: false,
    params: {},
    referrerPolicy: 'no-referrer',
    integrity: '',
    keepalive: true,
    mode: 'cors',
    redirect: 'manual',
    referrer: '',
    destination: 'document',
  }
  expect(parseGraphQLRequest(getRequest)).toEqual({
    operationType: 'mutation',
    operationName: 'Login',
  })

  const postRequest: MockedRequest = {
    id: 'abc-123',
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {
      query: `query GetUser { user { firstName } }`,
    },
    cache: 'default',
    credentials: 'same-origin',
    cookies: {},
    bodyUsed: false,
    params: {},
    referrerPolicy: 'no-referrer',
    integrity: '',
    keepalive: true,
    mode: 'cors',
    redirect: 'manual',
    referrer: '',
    destination: 'document',
  }
  expect(parseGraphQLRequest(postRequest)).toEqual({
    operationType: 'query',
    operationName: 'GetUser',
  })
})

test('returns false given a GraphQL-incompatible request', () => {
  const getRequest: MockedRequest = {
    id: 'abc-123',
    method: 'GET',
    url: new URL('http://localhost:8080/query'),
    headers: new Headers({ 'content-type': 'application/json' }),
    cache: 'default',
    credentials: 'same-origin',
    cookies: {},
    body: '',
    bodyUsed: false,
    params: {},
    referrerPolicy: 'no-referrer',
    integrity: '',
    keepalive: true,
    mode: 'cors',
    redirect: 'manual',
    referrer: '',
    destination: 'document',
  }
  expect(parseGraphQLRequest(getRequest)).toBeNull()

  const postRequest: MockedRequest = {
    id: 'abc-123',
    method: 'POST',
    url: new URL('http://localhost:8080/graphql'),
    headers: new Headers({ 'content-type': 'application/json' }),
    body: {
      queryUser: true,
    },
    cache: 'default',
    credentials: 'same-origin',
    cookies: {},
    bodyUsed: false,
    params: {},
    referrerPolicy: 'no-referrer',
    integrity: '',
    keepalive: true,
    mode: 'cors',
    redirect: 'manual',
    referrer: '',
    destination: 'document',
  }
  expect(parseGraphQLRequest(postRequest)).toBeNull()
})
