import { Headers } from 'headers-polyfill'
import { RestRequest } from '../../handlers/RestHandler'
import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { setRequestCookies } from './setRequestCookies'
import { parseBody } from './parseBody'
import { pruneGetRequestBody } from './pruneGetRequestBody'

/**
 * Converts a given request received from the Service Worker
 * into a `MockedRequest` instance.
 */
export function parseWorkerRequest(
  rawRequest: ServiceWorkerIncomingRequest,
): RestRequest {
  const request: RestRequest = {
    id: rawRequest.id,
    cache: rawRequest.cache,
    credentials: rawRequest.credentials,
    method: rawRequest.method,
    url: new URL(rawRequest.url),
    referrer: rawRequest.referrer,
    referrerPolicy: rawRequest.referrerPolicy,
    redirect: rawRequest.redirect,
    mode: rawRequest.mode,
    params: {},
    cookies: {},
    integrity: rawRequest.integrity,
    keepalive: rawRequest.keepalive,
    destination: rawRequest.destination,
    body: pruneGetRequestBody(rawRequest),
    bodyUsed: rawRequest.bodyUsed,
    headers: new Headers(rawRequest.headers),
  }

  // Set document cookies on the request.
  setRequestCookies(request)

  // Parse the request's body based on the "Content-Type" header.
  request.body = parseBody(request.body, request.headers)

  return request
}
