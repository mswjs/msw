import { MockedRequest } from './handlers/requestHandler'

type CustomFunction = (req: MockedRequest) => void

export type OnUnhandledRequest = 'bypass' | 'warn' | 'error' | CustomFunction

export function onUnhandledRequest(
  request: MockedRequest,
  onUnhandledRequest: OnUnhandledRequest = 'bypass',
) {
  if (typeof onUnhandledRequest === 'function') {
    onUnhandledRequest(request)
    return
  }

  if (['warn', 'error'].includes(onUnhandledRequest)) {
    const message = `[MSW] A request to ${request.url} was detected but not mocked because no request handler matching the URL exists.`

    if (onUnhandledRequest === 'warn') {
      console.warn(message)
    } else {
      throw new Error(message)
    }
    return
  }

  // if onUnhandledRequest is 'bypass' we have nothing to do.
}
