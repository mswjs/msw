import { Headers } from 'headers-utils'
import { MockedRequest } from '../../handlers/RequestHandler'
import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { setRequestCookies } from './setRequestCookies'
import { parseBody } from './parseBody'
import { pruneGetRequestBody } from './pruneGetRequestBody'

export function parseWorkerRequest(
  rawRequest: ServiceWorkerIncomingRequest,
): MockedRequest {
  const request = {
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
  request.body = parseBody(request.body, request.headers) as any

  return request
}
