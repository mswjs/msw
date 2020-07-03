import { getJsonBody } from './../getJsonBody'
import { MockedRequest } from '../../handlers/requestHandler'

export function parseRequestBody(
  body?: MockedRequest['body'],
  headers?: MockedRequest['headers'],
) {
  if (body) {
    // If the intercepted request's body has a JSON Content-Type
    // parse it into an object, otherwise leave as-is.
    const hasJsonContent = headers?.get('content-type')?.includes('json')

    if (hasJsonContent && typeof body !== 'object') {
      return getJsonBody(body)
    }

    return body
  }

  // Return whatever falsey body value is given.
  return body
}
