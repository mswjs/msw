import { isNodeProcess } from 'is-node-process'
import { Headers } from 'headers-polyfill'
import { MockedRequest } from '../handlers/RequestHandler'

const useFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response> =
  isNodeProcess() ? require('node-fetch') : window.fetch

export const augmentRequestInit = (requestInit: RequestInit): RequestInit => {
  const headers = new Headers(requestInit.headers)
  headers.set('x-msw-bypass', 'true')

  return {
    ...requestInit,
    headers: headers.all(),
  }
}

export const createFetchRequestParameters = (
  input: MockedRequest,
): RequestInit => {
  const { body, method } = input
  const requestParameters: RequestInit = {
    ...input,
    body: undefined,
  }

  if (['GET', 'HEAD'].includes(method)) {
    return requestParameters
  }

  // When the user made their original request, the browser added a boundary e.g.
  // "content-type": multipart/form-data; boundary=----WebKitFormBoundarygyGKnRF8C9LT0BhB"
  // If we now reuse this string as a user-provided header, the form-data will break and no payload will be send
  // https://community.cloudflare.com/t/cannot-seem-to-send-multipart-form-data/163491/2
  if (
    input.headers.get('content-type')?.includes('multipart/form-data') &&
    typeof body === 'object'
  ) {
    input.headers.delete('content-type')
    const formData = new FormData()
    for (const key in body) {
      formData.append(key, body[key])
    }
    requestParameters.body = formData
    return requestParameters
  }

  if (
    typeof body === 'object' ||
    typeof body === 'number' ||
    typeof body === 'boolean'
  ) {
    requestParameters.body = JSON.stringify(body)
  } else {
    requestParameters.body = body
  }

  return requestParameters
}

/**
 * Performs a bypassed request inside a request handler.
 * @example
 * const originalResponse = await ctx.fetch(req)
 * @see {@link https://mswjs.io/docs/api/context/fetch `ctx.fetch()`}
 */
export const fetch = (
  input: string | MockedRequest,
  requestInit: RequestInit = {},
): Promise<Response> => {
  if (typeof input === 'string') {
    return useFetch(input, augmentRequestInit(requestInit))
  }

  const requestParameters = createFetchRequestParameters(input)
  const derivedRequestInit = augmentRequestInit(requestParameters)

  return useFetch(input.url.href, derivedRequestInit)
}
