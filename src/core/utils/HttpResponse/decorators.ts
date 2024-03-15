import statuses from '@bundled-es-modules/statuses'
import type { HttpResponseInit } from '../../HttpResponse'
import { Headers as HeadersPolyfill } from 'headers-polyfill'

const { message } = statuses

export interface HttpResponseDecoratedInit extends HttpResponseInit {
  status: number
  statusText: string
  headers: Headers
}

export function normalizeResponseInit(
  init: HttpResponseInit = {},
): HttpResponseDecoratedInit {
  const status = init?.status || 200
  const statusText = init?.statusText || message[status] || ''
  const headers = new Headers(init?.headers)

  return {
    ...init,
    headers,
    status,
    statusText,
  }
}

export function decorateResponse(
  response: Response,
  init: HttpResponseDecoratedInit,
): Response {
  // Allow to mock the response type.
  if (init.type) {
    Object.defineProperty(response, 'type', {
      value: init.type,
      enumerable: true,
      writable: false,
    })
  }

  // Cookie forwarding is only relevant in the browser.
  if (typeof document !== 'undefined') {
    // Write the mocked response cookies to the document.
    // Use `headers-polyfill` to get the Set-Cookie header value correctly.
    // This is an alternative until TypeScript 5.2
    // and Node.js v20 become the minimum supported version
    // and getSetCookie in Headers can be used directly.
    const responseCookies = HeadersPolyfill.prototype.getSetCookie.call(
      init.headers,
    )

    for (const cookieString of responseCookies) {
      // No need to parse the cookie headers because it's defined
      // as the valid cookie string to begin with.
      document.cookie = cookieString
    }
  }

  return response
}
