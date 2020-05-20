import { listToHeaders } from 'headers-utils'
import { ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { getJsonBody } from '../getJsonBody'

/**
 * Formats a mocked response for introspection in browser's console.
 */
export function prepareResponse(res: ResponseWithSerializedHeaders) {
  const resHeaders = listToHeaders(res.headers)

  return {
    ...res,
    // Parse a response JSON body for preview in the logs
    body: resHeaders.get('content-type')?.includes('json')
      ? getJsonBody(res.body)
      : res.body,
  }
}
