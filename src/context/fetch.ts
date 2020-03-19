import { MockedRequest } from '../handlers/requestHandler'

const gracefully = <ResponseType>(
  promise: Promise<Response>,
): Promise<ResponseType> => {
  return promise.then((res) => res.json().catch(() => res.text()))
}

const augmentRequestInit = (requestInit: RequestInit): RequestInit => {
  return {
    ...requestInit,
    headers: {
      ...requestInit.headers,
      'x-msw-bypass': 'true',
    },
  }
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
      window.fetch(input, augmentRequestInit(requestInit)),
    )
  }

  const { body } = input
  const compliantReq: RequestInit = augmentRequestInit({
    ...input,
    body: typeof body === 'object' ? JSON.stringify(body) : body,
  })

  return gracefully<ResponseType>(window.fetch(input.url, compliantReq))
}
