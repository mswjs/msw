import statuses from '@bundled-es-modules/statuses'
import type { HttpResponseInit } from '../../HttpResponse'

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
    // Extract the Set-Cookie from the response header entry
    // so that it can be parsed correctly even if the Set-Cookie value contains commas.
    // This is a temporary solution until the getSetCookie method of Headers
    // is available in TypeScript 5.2 or later.
    const responseCookies = Array.from(init.headers.entries()).reduce<string[]>(
      (cookies, [name, value]) => {
        if (name.match(/set-cookie/i)) {
          cookies.push(value)
        }
        return cookies
      },
      [],
    )

    for (const cookieString of responseCookies) {
      // No need to parse the cookie headers because it's defined
      // as the valid cookie string to begin with.
      document.cookie = cookieString
    }
  }

  return response
}
