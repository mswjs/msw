import { objectToHeaders } from 'headers-polyfill'
import { SerializedResponse } from '../../setupWorker/glossary'
import { parseBody } from '../request/parseBody'

/**
 * Formats a mocked response for introspection in the browser's console.
 */
export function prepareResponse(res: SerializedResponse<string>) {
  const responseHeaders = objectToHeaders(res.headers)

  // Parse a response JSON body for preview in the logs
  const parsedBody = parseBody(res.body, responseHeaders)

  return {
    ...res,
    body: parsedBody,
  }
}
