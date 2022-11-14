import { HeadersObject, headersToObject } from 'headers-polyfill'

export interface LoggedRequest {
  url: URL
  method: string
  headers: HeadersObject
  body: string
}

/**
 * Formats a mocked request for introspection in browser's console.
 */
export async function serializeRequest(
  request: Request,
): Promise<LoggedRequest> {
  const requestClone = request.clone()
  const requestText = await requestClone.text()

  return {
    url: new URL(request.url),
    method: request.method,
    headers: headersToObject(request.headers),
    body: requestText,
  }
}
