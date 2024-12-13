import { FetchResponse } from '@mswjs/interceptors'
import { isObject } from '../internal/isObject'

export interface SerializedRequest {
  __serializedType: 'request'
  method: string
  url: string
  headers: Array<[string, string]>
  body: ArrayBuffer | undefined
}

export interface SerializedResponse {
  __serializedType: 'response'
  status: number
  statusText?: string
  headers: Array<[string, string]>
  body: ArrayBuffer | undefined
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
    __serializedType: 'request',
    method: request.method,
    url: request.url,
    headers: Array.from(request.headers),
    body: requestBody,
  }
}

export function isSerializedRequest(
  value: unknown,
): value is SerializedRequest {
  return (
    isObject(value) &&
    '__serializedType' in value &&
    value.__serializedType === 'request'
  )
}

/**
 * Create a Fetch API `Request` instance out of the
 * given serialized request object. Useful to revive
 * serialized requests during a message channel transfer.
 */
export function deserializeRequest(serialized: SerializedRequest): Request {
  return new Request(serialized.url, {
    method: serialized.method,
    headers: serialized.headers,
    body: serialized.body,
  })
}

/**
 * Serialize a given Fetch API `Response` into its
 * plain object representation. Useful if you want
 * to send this response over a message channel.
 */
export async function serializeResponse(
  response: Response,
): Promise<SerializedResponse> {
  const responseBody =
    response.body === null ? undefined : await response.clone().arrayBuffer()

  return {
    __serializedType: 'response',
    status: response.status,
    statusText: response.statusText,
    headers: Array.from(response.headers),
    body: responseBody,
  }
}

export function isSerializedResponse(
  value: unknown,
): value is SerializedResponse {
  return (
    isObject(value) &&
    '__serializedType' in value &&
    value.__serializedType === 'response'
  )
}

/**
 * Create a Fetch API `Response` instance out of the
 * given serialized response object. Useful to revive
 * serialized responses during a message channel transfer.
 */
export function deserializeResponse(serialized: SerializedResponse): Response {
  return new FetchResponse(serialized.body, {
    status: serialized.status,
    statusText: serialized.statusText,
    headers: serialized.headers,
  })
}
