import {
  headersToObject,
  flattenHeadersObject,
  type FlatHeadersObject,
} from 'headers-polyfill'

export interface SerializedRequest {
  method: string
  url: string
  headers: FlatHeadersObject
  body?: ArrayBuffer
}

export interface SerializedResponse {
  status: number
  statusText?: string
  headers: FlatHeadersObject
  body?: ArrayBuffer
}

/**
 * Serialize a given Fetch API `Request` into its
 * plain object representation. Useful if you want
 * to send this request over a message channel.
 */
export async function serializeRequest(
  request: Request,
): Promise<SerializedRequest> {
  const requestBody = ['HEAD', 'GET'].includes(request.method)
    ? undefined
    : await request.clone().arrayBuffer()

  return {
    method: request.method,
    url: request.url,
    headers: flattenHeadersObject(headersToObject(request.headers)),
    body: requestBody,
  }
}

/**
 * Create a Fetch API `Request` instance out of the
 * given serialized request object. Useful to revive
 * serialized requests during a message channel transfer.
 */
export function deserializeRequest(serialized: SerializedRequest): Request {
  const request = new Request(serialized.url, {
    method: serialized.method,
    headers: serialized.headers,
    body: serialized.body,
  })

  return request
}

/**
 * Serialize a given Fetch API `Response` into its
 * plain object representation. Useful if you want
 * to send this response over a message channel.
 */
export async function serializeResponse(
  response: Response,
): Promise<SerializedResponse> {
  const responseBody = await response.clone().arrayBuffer()

  return {
    status: response.status,
    statusText: response.statusText,
    headers: flattenHeadersObject(headersToObject(response.headers)),
    body: responseBody,
  }
}

/**
 * Create a Fetch API `Response` instance out of the
 * given serialized response object. Useful to revive
 * serialized responses during a message channel transfer.
 */
export function deserializeResponse(serialized: SerializedResponse): Response {
  const response = new Response(serialized.body, {
    status: serialized.status,
    statusText: serialized.statusText,
    headers: serialized.headers,
  })

  return response
}
