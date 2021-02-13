import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { isStringEqual } from '../internal/isStringEqual'

type Input = Pick<ServiceWorkerIncomingRequest, 'method' | 'body'>

/**
 * Ensures that an empty GET request body is always represented as `undefined`.
 */
export function pruneGetRequestBody(
  request: Input,
): ServiceWorkerIncomingRequest['body'] {
  if (
    request.method &&
    isStringEqual(request.method, 'GET') &&
    request.body === ''
  ) {
    return undefined
  }

  return request.body
}
