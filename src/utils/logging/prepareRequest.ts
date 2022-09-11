import type { DefaultBodyType } from '../../handlers/RequestHandler.js'
import type { MockedRequest } from '../request/MockedRequest.js'

export interface LoggedRequest {
  id: string
  url: URL
  method: string
  headers: Record<string, string>
  cookies: Record<string, string>
  body: DefaultBodyType
}

/**
 * Formats a mocked request for introspection in browser's console.
 */
export function prepareRequest(request: MockedRequest): LoggedRequest {
  return {
    ...request,
    body: request.body,
    headers: request.headers.all(),
  }
}
