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
  /**
   * Define a `Response` with a `Content-Type: "text/plain"` body.
   * @example
   * HttpResponse.text('hello world')
   * HttpResponse.text('Error', { status: 500 })
   */
  text<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'text/plain')
    return createResponse(body, responseInit)
  },

  /**
   * Define a `Response` with a `Content-Type: "application/json"` body.
   * @example
   * HttpResponse.json({ firstName: 'John' })
   * HttpResponse.json({ error: 'Not Authorized' }, { status: 401 })
   */
  json<
    BodyType extends
      | Record<string, unknown>
      | Array<unknown>
      | boolean
      | number,
  >(body?: BodyType | null, init?: HttpResponseInit): Response {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'application/json')
    return createResponse(JSON.stringify(body), responseInit)
  },

  /**
   * Define a `Response` with a `Content-Type: "application/xml"` body.
   * @example
   * HttpResponse.xml(`<user name="John" />`)
   * HttpResponse.xml(`<article id="abc-123" />`, { status: 201 })
   */
  xml<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'text/xml')
    return createResponse(body, responseInit)
  },

  arrayBuffer(body?: ArrayBuffer, init?: HttpResponseInit): Response {
    const responseInit = decorateResponseInit(init)

    if (body) {
      responseInit.headers.set('Content-Length', body.byteLength.toString())
    }

    return createResponse(body, responseInit)
  },

  /**
   * @todo Support:
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
  if (responseCookie && typeof document !== 'undefined') {
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
