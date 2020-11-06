import { MockedRequest } from '../handlers/requestHandler'
import { getPublicUrlFromRequest } from './getPublicUrlFromRequest'

type UnhandledRequestCallback = (req: MockedRequest) => void

export type OnUnhandledRequest =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

export function onUnhandledRequest(
  request: MockedRequest,
  onUnhandledReq: OnUnhandledRequest = 'bypass',
): void {
  if (typeof onUnhandledReq === 'function') {
    onUnhandledReq(request)
    return
  }

  const publicUrl = getPublicUrlFromRequest(request)

  const message = `captured a ${request.method} ${
    request.url
  } request without a corresponding request handler.

  If you wish to intercept this request, consider creating a request handler for it:

  rest.${request.method.toLowerCase()}('${publicUrl}', (req, res, ctx) => {
    return res(ctx.text('body'))
  })`

  switch (onUnhandledReq) {
    case 'error': {
      throw new Error(`[MSW] Error: ${message}`)
    }

    case 'warn': {
      console.warn(`[MSW] Warning: ${message}`)
    }

    default:
      return
  }
}
