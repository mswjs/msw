import { Headers } from 'headers-utils'
import { MockedRequest } from '../utils/handlers/requestHandler'
import { isNodeProcess } from '../utils/internal/isNodeProcess'

const useFetch = isNodeProcess() ? require('node-fetch') : window.fetch

export const augmentRequestInit = (requestInit: RequestInit): RequestInit => {
  const headers = new Headers(requestInit.headers)
  headers.set('x-msw-bypass', 'true')

  return {
    ...requestInit,
    headers: headers.getAllHeaders(),
  }
}

const createFetchRequestParameters = (input: MockedRequest) => {
  const { body, method } = input
  const requestParameters: RequestInit = {
    ...input,
    body: undefined,
  }

  if (['GET', 'HEAD'].includes(method)) {
    return requestParameters
  }

  requestParameters.body =
    typeof body === 'object' ? JSON.stringify(body) : body

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
) => {
  // Keep the default `window.fetch()` call signature
  if (typeof input === 'string') {
    return useFetch(input, augmentRequestInit(requestInit))
  }

  const requestParameters: RequestInit = createFetchRequestParameters(input)

  const compliantRequest: RequestInit = augmentRequestInit(requestParameters)

  return useFetch(input.url.href, compliantRequest)
}
