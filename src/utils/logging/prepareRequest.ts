import { MockedRequest } from '../request/MockedRequest.js'

/**
 * Formats a mocked request for introspection in browser's console.
 */
export function prepareRequest(request: MockedRequest) {
  return {
    ...request,
    body: request.body,
    headers: request.headers.all(),
  }
}
