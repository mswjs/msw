import { Headers } from 'headers-utils'
import { MockedRequest } from '../utils/handlers/requestHandler'
import { isNodeProcess } from '../utils/internal/isNodeProcess'

const useFetch = isNodeProcess() ? require('node-fetch') : window.fetch

const gracefully = <ResponseType>(
  promise: Promise<Response>,
): Promise<ResponseType> => {
  return promise.then((res) => {
    if (res.headers.get('content-type')?.includes('json')) {
      return res.json()
    }

    return res.text()
  })
}

export const augmentRequestInit = (requestInit: RequestInit): RequestInit => {
  const headers = new Headers(requestInit.headers)
  headers.set('x-msw-bypass', 'true')

  return {
    ...requestInit,
    headers: headers.getAllHeaders(),
  }
}

const createFetchRequestParameters = (input: MockedRequest) => {
  const { body } = input
  const requestParameters: RequestInit = {
    ...input,
    body: null,
  }

  if (input.method !== 'GET' && input.method !== 'HEAD') {
    requestParameters.body =
      typeof body === 'object' ? JSON.stringify(body) : body
  }

  return requestParameters
}

/**
 * Wrapper around the native `window.fetch()` function that performs
 * a request bypassing MSW. Requests performed using
 * this function will never be mocked.
 */
export const fetch = <ResponseType = any>(
  input: string | MockedRequest,
  requestInit: RequestInit = {},
) => {
  // Keep the default `window.fetch()` call signature
  if (typeof input === 'string') {
    return gracefully<ResponseType>(
      useFetch(input, augmentRequestInit(requestInit)),
    )
  }

  const requestParameters: RequestInit = createFetchRequestParameters(input)

  const compliantReq: RequestInit = augmentRequestInit(requestParameters)

  return gracefully<ResponseType>(useFetch(input.url.href, compliantReq))
}
