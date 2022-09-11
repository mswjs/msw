import { flattenHeadersObject, headersToObject } from 'headers-polyfill'
import type { SerializedResponse } from '../../setupWorker/glossary'

export function serializeResponse(source: Response): SerializedResponse<any> {
  return {
    status: source.status,
    statusText: source.statusText,
    headers: flattenHeadersObject(headersToObject(source.headers)),
    body: source.body,
  }
}
