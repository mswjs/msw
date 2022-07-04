import { Headers } from 'headers-polyfill'
import { MockedRequest } from '../../handlers/RequestHandler'
import { RestRequest } from '../../handlers/RestHandler'
import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { setRequestCookies } from './setRequestCookies'
import { IsomorphicRequest } from '@mswjs/interceptors'
import { encodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'

/**
 * Converts a given request received from the Service Worker
 * into a `MockedRequest` instance.
 */
export function parseWorkerRequest(
  rawRequest: ServiceWorkerIncomingRequest,
): RestRequest {
  const isomorphicRequest = new IsomorphicRequest(new URL(rawRequest.url), {
    ...rawRequest,
    body: encodeBuffer(rawRequest.body || ''),
    headers: new Headers(rawRequest.headers),
  })
  const mockedRequest = new MockedRequest(isomorphicRequest, rawRequest)

  // Set document cookies on the request.
  setRequestCookies(mockedRequest)

  return new RestRequest(mockedRequest, {})
}
