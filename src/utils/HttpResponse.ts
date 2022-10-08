import * as cookieUtils from 'cookie'
import httpStatusTexts from 'statuses/codes.json'
import { Headers } from 'headers-polyfill'

export interface HttpResponseInit extends ResponseInit {
  type?: ResponseType
}

export interface HttpResponseDecoratedInit extends HttpResponseInit {
  status: number
  statusText: string
  headers: Headers
}

export const HttpResponse = {
  text<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    return createResponse(body, decorateResponseInit(init))
  },

  json<BodyType extends Record<string, unknown>>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'application/json')
    return createResponse(JSON.stringify(body), responseInit)
  },

  xml<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'application/xml')
    return createResponse(body, responseInit)
  },

  /**
   * @todo Support:
   * - ArrayBuffer
   * - FormData
   * - ReadableStream
   */
}

function createResponse(
  body: BodyInit | null | undefined,
  init: HttpResponseDecoratedInit,
): Response {
  const response = new Response(body, init)
  decorateResponse(response, init)
  return response
}

function decorateResponseInit(
  init: HttpResponseInit = {},
): HttpResponseDecoratedInit {
  const status = init?.status || 200
  const statusText =
    init?.statusText ||
    httpStatusTexts[status.toString() as keyof typeof httpStatusTexts]
  const headers = new Headers(init?.headers)

  return {
    ...init,
    headers,
    status,
    statusText,
  }
}

function decorateResponse(
  response: Response,
  init: HttpResponseDecoratedInit,
): Response {
  // Allow to mock the response type.
  if (init?.type) {
    defineReadOnly(response, 'type', init.type)
  }

  // Write the mocked response cookies to the document.
  const responseCookie = init?.headers?.get('Set-Cookie')
  if (responseCookie) {
    /**
     * @todo Support multiple "Set-Cookie" response headers.
     */
    const cookies = cookieUtils.parse(responseCookie)
    for (const cookieName in cookies) {
      document.cookie = `${cookieName}=${cookies[cookieName]}`
    }
  }

  return response
}

function defineReadOnly(
  target: any,
  propertyName: string,
  value: unknown,
): void {
  Object.defineProperty(target, propertyName, {
    value,
    enumerable: true,
    writable: false,
  })
}
