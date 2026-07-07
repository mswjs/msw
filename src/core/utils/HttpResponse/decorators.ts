import statuses from '../../../shims/statuses'
import type { HttpResponse, HttpResponseInit } from '../../HttpResponse'

const { message } = statuses

const kSetCookie = Symbol('kSetCookie')

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
  response: HttpResponse<any>,
  init: HttpResponseDecoratedInit,
): Response {
  // Allow mocking the response type.
  if (init.type) {
    Object.defineProperty(response, 'type', {
      value: init.type,
      enumerable: true,
      writable: false,
    })
  }

  const responseCookies = init.headers.get('set-cookie')

  if (responseCookies) {
    // Record the raw "Set-Cookie" response header provided
    // in the HeadersInit. This is later used to store these cookies
    // in cookie jar and return the right cookies in the "cookies"
    // response resolver argument.
    Object.defineProperty(response, kSetCookie, {
      value: responseCookies,
      enumerable: false,
      writable: false,
    })
  }

  return response
}

export function getRawSetCookie(response: Response): string | undefined {
  return Reflect.get(response, kSetCookie)
}

/**
 * Copy the given response own properties, like internal symbols,
 * onto another response. Used for faithful internal copying of responses.
 */
export function copyResponseOwnProperties(
  source: Response,
  target: Response,
): void {
  for (const propertyName of Reflect.ownKeys(source)) {
    const descriptor = Object.getOwnPropertyDescriptor(source, propertyName)
    const existingDescriptor = Object.getOwnPropertyDescriptor(
      target,
      propertyName,
    )

    if (descriptor && existingDescriptor == null) {
      Object.defineProperty(target, propertyName, descriptor)
    }
  }
}
