import { MockedRequest } from '../handlers/requestHandler'
import { jsonParse } from '../internal/jsonParse'

/**
 * Parses a given request/response body based on the `Content-Type` header.
 */
export function parseBody(body?: MockedRequest['body'], headers?: Headers) {
  if (body) {
    // If the intercepted request's body has a JSON Content-Type
    // parse it into an object, otherwise leave as-is.
    const hasJsonContent = headers?.get('content-type')?.endsWith('json')

    if (hasJsonContent && typeof body !== 'object') {
      return jsonParse(body) || body
    }

    return body
  }

  // Return whatever falsey body value is given.
  return body
}
