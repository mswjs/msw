import type { ServiceWorkerIncomingRequest } from '../../../browser/setupWorker/glossary'
import { pruneGetRequestBody } from './pruneGetRequestBody'

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
