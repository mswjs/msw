import { ServiceWorkerIncomingRequest } from '../../setupWorker/glossary'

type Input = Pick<ServiceWorkerIncomingRequest, 'method' | 'body'>

/**
 * Ensures that an empty GET request body is always represented as `undefined`.
 */
export function pruneGetRequestBody(
  request: Input,
): ServiceWorkerIncomingRequest['body'] {
  if (
    request.method &&
    ['HEAD', 'GET'].includes(request.method.toUpperCase()) &&
    request.body === ''
  ) {
    return undefined
  }

  return request.body
}
