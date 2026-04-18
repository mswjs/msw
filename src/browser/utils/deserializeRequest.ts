import { FetchRequest } from '@mswjs/interceptors'
import type { IncomingWorkerRequest } from './workerChannel'

/**
 * Converts a given request received from the Service Worker
 * into a Fetch `Request` instance.
 */
export function deserializeRequest(
  serializedRequest: IncomingWorkerRequest,
): Request {
  return new FetchRequest(serializedRequest.url, {
    ...serializedRequest,
  })
}
