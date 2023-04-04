import { GraphQLRequestBody } from '../../handlers/GraphQLHandler'
import { MockedRequest, MockedRequestInit } from '../request/MockedRequest'
import { Headers } from 'headers-polyfill'
import { encodeBuffer } from '@mswjs/interceptors'

export function createGetGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
) {
  const requestUrl = new URL(hostname)
  requestUrl.searchParams.set('query', body?.query)
  requestUrl.searchParams.set('variables', JSON.stringify(body?.variables))
  return new MockedRequest(requestUrl)
}

export function createPostGraphQLRequest(
  body: GraphQLRequestBody<any>,
  hostname = 'https://example.com',
  requestInit: MockedRequestInit = {},
) {
  return new MockedRequest(new URL(hostname), {
    method: 'POST',
    ...requestInit,
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: encodeBuffer(JSON.stringify(body)),
  })
}
