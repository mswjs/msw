import { pruneGetRequestBody } from './pruneGetRequestBody'
import type { ServiceWorkerIncomingRequest } from '../glossary'

/**
 * Converts a given request received from the Service Worker
 * into a Fetch `Request` instance.
 */
export function deserializeRequest(
  serializedRequest: ServiceWorkerIncomingRequest,
): Request {
  return new Request(serializedRequest.url, {
    ...serializedRequest,
    body: pruneGetRequestBody(serializedRequest),
  })
}
