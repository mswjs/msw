import { MockedRequest } from '../../handlers/RequestHandler'

/**
 * Formats a mocked request for introspection in browser's console.
 */
export function prepareRequest(request: MockedRequest) {
  return {
    ...request,
    headers: request.headers.all(),
  }
}
