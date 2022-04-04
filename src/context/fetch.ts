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

  switch (typeof body) {
    case 'object':
      if (input.headers?.get('content-type')?.includes('multipart/form-data')) {
        const formData = new FormData()
        for (const key in body) {
          formData.append(key, body[key])
        }
        requestParameters.body = formData
      } else {
        requestParameters.body = JSON.stringify(body)
      }
      break
    case 'number':
    case 'boolean':
      requestParameters.body = JSON.stringify(body)
      break
    default:
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
