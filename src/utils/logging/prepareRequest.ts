import { type HeadersObject, headersToObject } from 'headers-polyfill'
import { type DefaultBodyType } from '../../handlers/RequestHandler'

export interface LoggedRequest {
  id: string
  url: URL
  method: string
  headers: HeadersObject
  body: DefaultBodyType
}

/**
 * Formats a mocked request for introspection in browser's console.
 */
export function prepareRequest(request: Request): LoggedRequest {
  return {
    ...request,
    id: '',
    headers: headersToObject(request.headers),
    url: new URL(request.url),
    body: request.body,
  }
}
