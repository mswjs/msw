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
    body: rawRequest.body || new ArrayBuffer(0),
    headers,
  })
}
