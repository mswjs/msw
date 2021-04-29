import { objectToHeaders } from 'headers-utils'
import { SerializedResponse } from '../../setupWorker/glossary'
import { parseBody } from '../request/parseBody'

/**
 * Formats a mocked response for introspection in browser's console.
 */
export function prepareResponse(res: SerializedResponse<any>) {
  const responseHeaders = objectToHeaders(res.headers)

  return {
    ...res,
    // Parse a response JSON body for preview in the logs
    body: parseBody(res.body, responseHeaders),
  }
}
