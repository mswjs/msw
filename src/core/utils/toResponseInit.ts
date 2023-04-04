import { flattenHeadersObject, headersToObject } from 'headers-polyfill'

export function toResponseInit(response: Response): ResponseInit {
  return {
    status: response.status,
    statusText: response.statusText,
    headers: flattenHeadersObject(headersToObject(response.headers)),
  }
}
