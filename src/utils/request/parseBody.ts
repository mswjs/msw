import { jsonParse } from '../internal/jsonParse'
import { parseMultipartData } from '../internal/parseMultipartData'
import { MockedRequest } from './MockedRequest'

/**
 * Parses a given request/response body based on the "Content-Type" header.
 */
export function parseBody(body?: MockedRequest['body'], headers?: Headers) {
  // Return whatever falsey body value is given.
  if (!body) {
    return body
  }

  const contentType = headers?.get('content-type')?.toLowerCase() || ''

  // If the body has a Multipart Content-Type
  // parse it into an object.
  const hasMultipartContent = contentType.startsWith('multipart/form-data')
  if (hasMultipartContent && typeof body !== 'object') {
    return parseMultipartData(body.toString(), headers) || body
  }

  // If the intercepted request's body has a JSON Content-Type
  // parse it into an object.
  const hasJsonContent = contentType.includes('json')

  if (hasJsonContent && typeof body !== 'object') {
    return jsonParse(body.toString()) || body
  }

  // Otherwise leave as-is.
  return body
}
