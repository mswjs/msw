import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { pruneGetRequestBody } from './pruneGetRequestBody'

/**
 * Converts a given request received from the Service Worker
 * into a `MockedRequest` instance.
 */
export function parseWorkerRequest(
  rawRequest: ServiceWorkerIncomingRequest,
): Request {
  console.log({ rawRequest })

  /**
   * @todo See if we can't send "Request" as-is
   * from the worker. It should be transferrable.
   */
  return new Request(rawRequest.url, {
    ...rawRequest,
    body: pruneGetRequestBody(rawRequest),
  })
}
