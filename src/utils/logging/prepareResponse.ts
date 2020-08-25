import { listToHeaders } from 'headers-utils'
import { ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { parseBody } from '../request/parseBody'

/**
 * Formats a mocked response for introspection in browser's console.
 */
export function prepareResponse(res: ResponseWithSerializedHeaders<any>) {
  const responseHeaders = listToHeaders(res.headers)

  return {
    ...res,
    // Parse a response JSON body for preview in the logs
    body: parseBody(res.body, responseHeaders),
  }
}
