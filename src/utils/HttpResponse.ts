import httpStatusTexts from 'statuses/codes.json'
import { Headers } from 'headers-polyfill'
import { Response } from '../fetch'
import { type DefaultBodyType } from '../handlers/RequestHandler'

export interface HttpResponseInit extends ResponseInit {
  type?: ResponseType
}

export interface HttpResponseDecoratedInit extends HttpResponseInit {
  status: number
  statusText: string
  headers: Headers
}

declare const responseBodyType: unique symbol

/**
 * Opaque `Response` type that supports strict body type.
 */
export interface StrictResponse<BodyType extends DefaultBodyType>
  extends Response {
  readonly [responseBodyType]: BodyType
}

export const HttpResponse = {
  plain<BodyType extends string | BodyInit>(
    body?: BodyType,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = decorateResponseInit(init)
    return createResponse(body, responseInit)
  },

  /**
   * Create a `Response` with a `Content-Type: "text/plain"` body.
   * @example
   * HttpResponse.text('hello world')
   * HttpResponse.text('Error', { status: 500 })
   */
  text<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): StrictResponse<BodyType> {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'text/plain')
    return createResponse(body, responseInit)
  },

  /**
   * Create a `Response` with a `Content-Type: "application/json"` body.
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
  >(body?: BodyType | null, init?: HttpResponseInit): StrictResponse<BodyType> {
    const responseInit = decorateResponseInit(init)
    responseInit.headers.set('Content-Type', 'application/json')
    return createResponse(JSON.stringify(body), responseInit)
  },

  /**
   * Create a `Response` with a `Content-Type: "application/xml"` body.
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

  /**
   * Create a `Response` with an `ArrayBuffer` body.
   * @example
   * const buffer = new ArrayBuffer(3)
   * const view = new Uint8Array(buffer)
   * view.set([1, 2, 3])
   *
   * HttpResponse.arrayBuffer(buffer)
   */
  arrayBuffer(body?: ArrayBuffer, init?: HttpResponseInit) {
    const responseInit = decorateResponseInit(init)

    if (body) {
      responseInit.headers.set('Content-Length', body.byteLength.toString())
    }

    return createResponse(body, responseInit)
  },

  /**
   * Create a `Response` with a `FormData` body.
   * @example
   * const data = new FormData()
   * data.set('name', 'Alice')
   *
   * HttpResponse.formData(data)
   */
  formData(data?: FormData, init?: HttpResponseInit): Response {
    const responseInit = decorateResponseInit(init)
    return createResponse(data, responseInit)
  },
}

function createResponse(
  body: BodyInit | null | undefined,
  init: HttpResponseDecoratedInit,
): StrictResponse<any> {
  const response = new Response(body, init)
  decorateResponse(response, init)
  return response as StrictResponse<any>
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
  if (init.type) {
    defineReadOnly(response, 'type', init.type)
  }

  // Cookie forwarding is only relevant in the browser.
  if (typeof document !== 'undefined') {
    // Write the mocked response cookies to the document.
    // Note that Fetch API Headers will concatenate multiple "Set-Cookie"
    // headers into a single comma-separated string, just as it does
    // with any other multi-value headers.
    const responseCookies = init.headers.get('Set-Cookie')?.split(',') || []

    for (const cookieString of responseCookies) {
      // No need to parse the cookie headers because it's defined
      // as the valid cookie string to begin with.
      document.cookie = cookieString
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
