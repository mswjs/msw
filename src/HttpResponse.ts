import { Response } from './fetch'
import { type DefaultBodyType } from './handlers/RequestHandler'
import { createResponse } from './utils/HttpResponse/createResponse'
import { decorateResponseInit } from './utils/HttpResponse/decorators'

export interface HttpResponseInit extends ResponseInit {
  type?: ResponseType
}

declare const bodyType: unique symbol

/**
 * Opaque `Response` type that supports strict body type.
 */
export interface StrictResponse<BodyType extends DefaultBodyType>
  extends Response {
  readonly [bodyType]: BodyType
}

export interface StrictRequest<BodyType extends DefaultBodyType>
  extends Request {
  json(): Promise<BodyType>
}

export const HttpResponse = {
  plain<BodyType extends string | BodyInit>(
    body?: BodyType | null,
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
      | number
      | string,
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
