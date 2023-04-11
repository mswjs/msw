import { pruneGetRequestBody } from './pruneGetRequestBody'
import type { ServiceWorkerIncomingRequest } from '../setupWorker/glossary'

/**
 * Converts a given request received from the Service Worker
 * into a Fetch `Request` instance.
 */
export function parseWorkerRequest(
  incomingRequest: ServiceWorkerIncomingRequest,
): Request {
  return new Request(incomingRequest.url, {
    ...incomingRequest,
    body: pruneGetRequestBody(incomingRequest),
  })
}
