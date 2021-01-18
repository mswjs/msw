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
  handler: OnUnhandledRequest = 'bypass',
): void {
  if (typeof handler === 'function') {
    handler(request)
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

  switch (handler) {
    case 'error': {
      console.error(`[MSW] Error: ${message}`)
      break
    }

    case 'warn': {
      console.warn(`[MSW] Warning: ${message}`)
      break
    }

    default:
      return
  }
}
