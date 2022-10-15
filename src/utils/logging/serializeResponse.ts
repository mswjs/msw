import { type HeadersObject, headersToObject } from 'headers-polyfill'

export interface SerializedResponse {
  status: number
  statusText: string
  headers: HeadersObject
  body: string
}

export async function serializeResponse(
  response: Response,
): Promise<SerializedResponse> {
  const responseClone = response.clone()
  const responseText = await responseClone.text()

  return {
    status: responseClone.status,
    statusText: responseClone.statusText,
    headers: headersToObject(responseClone.headers),
    body: responseText,
  }
}
