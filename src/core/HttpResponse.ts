import type { DefaultBodyType, JsonBodyType } from './handlers/RequestHandler'
import type { NoInfer } from './typeUtils'
import {
  decorateResponse,
  normalizeResponseInit,
} from './utils/HttpResponse/decorators'

export interface HttpResponseInit extends ResponseInit {
  type?: ResponseType
}

declare const bodyType: unique symbol

export interface StrictRequest<BodyType extends DefaultBodyType>
  extends Request {
  json(): Promise<BodyType>
}

/**
 * Opaque `Response` type that supports strict body type.
 */
export interface StrictResponse<BodyType extends DefaultBodyType>
  extends Response {
  readonly [bodyType]: BodyType
}

/**
 * A drop-in replacement for the standard `Response` class
 * to allow additional features, like mocking the response `Set-Cookie` header.
 *
 * @example
 * new HttpResponse('Hello world', { status: 201 })
 * HttpResponse.json({ name: 'John' })
 * HttpResponse.formData(form)
 *
 * @see {@link https://mswjs.io/docs/api/http-response `HttpResponse` API reference}
 */
export class HttpResponse extends Response {
  constructor(body?: BodyInit | null, init?: HttpResponseInit) {
    const responseInit = normalizeResponseInit(init)
    super(body, responseInit)
    decorateResponse(this, responseInit)
  }

  /**
   * Create a `Response` with a `Content-Type: "text/plain"` body.
   * @example
   * HttpResponse.text('hello world')
   * HttpResponse.text('Error', { status: 500 })
   */
  static text<BodyType extends string>(
    body?: NoInfer<BodyType> | null,
    init?: HttpResponseInit,
  ): StrictResponse<BodyType> {
    const responseInit = normalizeResponseInit(init)

    if (!responseInit.headers.has('Content-Type')) {
      responseInit.headers.set('Content-Type', 'text/plain')
    }

    // Automatically set the "Content-Length" response header
    // for non-empty text responses. This enforces consistency and
    // brings mocked responses closer to production.
    if (!responseInit.headers.has('Content-Length')) {
      responseInit.headers.set(
        'Content-Length',
        body ? new Blob([body]).size.toString() : '0',
      )
    }

    return new HttpResponse(body, responseInit) as StrictResponse<BodyType>
  }

  /**
   * Create a `Response` with a `Content-Type: "application/json"` body.
   * @example
   * HttpResponse.json({ firstName: 'John' })
   * HttpResponse.json({ error: 'Not Authorized' }, { status: 401 })
   */
  static json<BodyType extends JsonBodyType>(
    body?: NoInfer<BodyType> | null,
    init?: HttpResponseInit,
  ): StrictResponse<BodyType> {
    const responseInit = normalizeResponseInit(init)

    if (!responseInit.headers.has('Content-Type')) {
      responseInit.headers.set('Content-Type', 'application/json')
    }

    /**
     * @note TypeScript is incorrect here.
     * Stringifying undefined will return undefined.
     */
    const responseText = JSON.stringify(body) as string | undefined

    if (!responseInit.headers.has('Content-Length')) {
      responseInit.headers.set(
        'Content-Length',
        responseText ? new Blob([responseText]).size.toString() : '0',
      )
    }

    return new HttpResponse(
      responseText,
      responseInit,
    ) as StrictResponse<BodyType>
  }

  /**
   * Create a `Response` with a `Content-Type: "application/xml"` body.
   * @example
   * HttpResponse.xml(`<user name="John" />`)
   * HttpResponse.xml(`<article id="abc-123" />`, { status: 201 })
   */
  static xml<BodyType extends string>(
    body?: BodyType | null,
    init?: HttpResponseInit,
  ): Response {
    const responseInit = normalizeResponseInit(init)

    if (!responseInit.headers.has('Content-Type')) {
      responseInit.headers.set('Content-Type', 'text/xml')
    }

    return new HttpResponse(body, responseInit)
  }

  /**
   * Create a `Response` with an `ArrayBuffer` body.
   * @example
   * const buffer = new ArrayBuffer(3)
   * const view = new Uint8Array(buffer)
   * view.set([1, 2, 3])
   *
   * HttpResponse.arrayBuffer(buffer)
   */
  static arrayBuffer(body?: ArrayBuffer, init?: HttpResponseInit): Response {
    const responseInit = normalizeResponseInit(init)

    if (body) {
      responseInit.headers.set('Content-Length', body.byteLength.toString())
    }

    return new HttpResponse(body, responseInit)
  }

  /**
   * Create a `Response` with a `FormData` body.
   * @example
   * const data = new FormData()
   * data.set('name', 'Alice')
   *
   * HttpResponse.formData(data)
   */
  static formData(body?: FormData, init?: HttpResponseInit): Response {
    return new HttpResponse(body, normalizeResponseInit(init))
  }
}
