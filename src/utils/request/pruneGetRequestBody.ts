import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'
import { isStringEqual } from '../internal/isStringEqual'

type Input = Pick<ServiceWorkerIncomingRequest, 'method' | 'body'>

/**
 * Ensures that an empty GET request body is always represented as `undefined`.
 */
export function pruneGetRequestBody(
  req: Input,
): ServiceWorkerIncomingRequest['body'] {
  if (req.method && isStringEqual(req.method, 'GET') && req.body === '') {
    return undefined
  }

  return req.body
}
