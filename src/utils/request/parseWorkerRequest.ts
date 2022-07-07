import { encodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'
import { Headers } from 'headers-polyfill'
import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { MockedRequest } from './MockedRequest'

/**
 * Converts a given request received from the Service Worker
 * into a `MockedRequest` instance.
 */
export function parseWorkerRequest(
  rawRequest: ServiceWorkerIncomingRequest,
): MockedRequest {
  const url = new URL(rawRequest.url)
  const headers = new Headers(rawRequest.headers)

  return new MockedRequest(url, {
    ...rawRequest,
    body: encodeBuffer(rawRequest.body || ''),
    headers,
  })

  // const request: RestRequest = {
  //   id: rawRequest.id,
  //   cache: rawRequest.cache,
  //   credentials: rawRequest.credentials,
  //   method: rawRequest.method,
  //   url: new URL(rawRequest.url),
  //   referrer: rawRequest.referrer,
  //   referrerPolicy: rawRequest.referrerPolicy,
  //   redirect: rawRequest.redirect,
  //   mode: rawRequest.mode,
  //   params: {},
  //   cookies: {},
  //   integrity: rawRequest.integrity,
  //   keepalive: rawRequest.keepalive,
  //   destination: rawRequest.destination,
  //   body: pruneGetRequestBody(rawRequest),
  //   bodyUsed: rawRequest.bodyUsed,
  //   headers: new Headers(rawRequest.headers),
  //   passthrough,
  // }

  // // Set document cookies on the request.
  // flushRequestCookies(request)

  // // Parse the request's body based on the "Content-Type" header.
  // request.body = parseBody(request.body, request.headers)

  // return request
}
