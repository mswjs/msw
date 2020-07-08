import { MockedRequest } from './handlers/requestHandler'

type UnhandledRequestCallback = (req: MockedRequest) => void

export type OnUnhandledRequest =
  | 'bypass'
  | 'warn'
  | 'error'
  | UnhandledRequestCallback

export function onUnhandledRequest(
  request: MockedRequest,
  onUnhandledRequest: OnUnhandledRequest = 'bypass',
): void {
  if (typeof onUnhandledRequest === 'function') {
    onUnhandledRequest(request)
    return
  }

  const message = `captured a ${request.method} ${request.url} request without a corresponding request handler.`

  switch (onUnhandledRequest) {
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
