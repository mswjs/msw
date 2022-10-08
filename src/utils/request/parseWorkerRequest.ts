import { type ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { pruneGetRequestBody } from './pruneGetRequestBody'

/**
 * Converts a given request received from the Service Worker
 * into a Fetch `Request` instance.
 */
export function parseWorkerRequest(
  incomingRequest: ServiceWorkerIncomingRequest,
): Request {
  // "Request" instance is not serializable so
  // it cannot be sent directly from the worker.
  return new Request(incomingRequest.url, {
    ...incomingRequest,
    /**
     * @todo See if it's possible to post ReadableStream
     * from the worker directly (if it's transferable).
     */
    body: pruneGetRequestBody(incomingRequest),
  })
}
