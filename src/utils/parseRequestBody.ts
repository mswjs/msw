import { getJsonBody } from './getJsonBody'
import { MockedRequest } from '../handlers/requestHandler'

type Request = Partial<Pick<MockedRequest, 'headers' | 'body'>>

export function parseRequestBody(
  body?: MockedRequest['body'],
  headers?: MockedRequest['headers'],
) {
  if (body) {
    // If the intercepted request's body has a JSON Content-Type
    // parse it into an object, otherwise leave as-is.
    const isJsonBody = headers?.get('content-type')?.includes('json')

    return isJsonBody && typeof body !== 'object' ? getJsonBody(body) : body
  }
}
