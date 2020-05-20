import { MockedRequest } from '../../handlers/requestHandler'

/**
 * Formats a mocked request for introspection in browser's console.
 */
export function prepareRequest(req: MockedRequest) {
  return {
    ...req,
    headers: req.headers.getAllHeaders(),
  }
}
