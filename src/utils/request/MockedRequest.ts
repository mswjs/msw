import * as cookieUtils from 'cookie'
import { store } from '@mswjs/cookies'
import { IsomorphicRequest, RequestInit } from '@mswjs/interceptors'
import { decodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'
import { Headers } from 'headers-polyfill/lib'
import { DefaultBodyType } from '../../handlers/RequestHandler'
import { MockedResponse } from '../../response'
import { getRequestCookies } from './getRequestCookies'
import { parseBody } from './parseBody'
import { isStringEqual } from '../internal/isStringEqual'

export type RequestCache =
  | 'default'
  | 'no-store'
  | 'reload'
  | 'no-cache'
  | 'force-cache'
  | 'only-if-cached'

export type RequestMode = 'navigate' | 'same-origin' | 'no-cors' | 'cors'

export type RequestRedirect = 'follow' | 'error' | 'manual'

export type RequestDestination =
  | ''
  | 'audio'
  | 'audioworklet'
  | 'document'
  | 'embed'
  | 'font'
  | 'frame'
  | 'iframe'
  | 'image'
  | 'manifest'
  | 'object'
  | 'paintworklet'
  | 'report'
  | 'script'
  | 'sharedworker'
  | 'style'
  | 'track'
  | 'video'
  | 'xslt'
  | 'worker'

export type RequestPriority = 'high' | 'low' | 'auto'

export type RequestReferrerPolicy =
  | ''
  | 'no-referrer'
  | 'no-referrer-when-downgrade'
  | 'origin'
  | 'origin-when-cross-origin'
  | 'same-origin'
  | 'strict-origin'
  | 'strict-origin-when-cross-origin'
  | 'unsafe-url'

export interface MockedRequestInit extends RequestInit {
  id?: string
  cache?: RequestCache
  redirect?: RequestRedirect
  integrity?: string
  keepalive?: boolean
  mode?: RequestMode
  priority?: RequestPriority
  destination?: RequestDestination
  referrer?: string
  referrerPolicy?: RequestReferrerPolicy
  cookies?: Record<string, string>
}

export class MockedRequest<
  RequestBody extends DefaultBodyType = DefaultBodyType,
> extends IsomorphicRequest {
  public readonly cache: RequestCache
  public readonly cookies: Record<string, string>
  public readonly destination: RequestDestination
  public readonly integrity: string
  public readonly keepalive: boolean
  public readonly mode: RequestMode
  public readonly priority: RequestPriority
  public readonly redirect: RequestRedirect
  public readonly referrer: string
  public readonly referrerPolicy: RequestReferrerPolicy

  constructor(request: IsomorphicRequest)
  constructor(url: URL, init?: MockedRequestInit)
  constructor(input: URL | IsomorphicRequest, init: MockedRequestInit = {}) {
    if (input instanceof IsomorphicRequest) {
      super(input)
    } else {
      super(input, init)
    }
    if (init.id) {
      this.id = init.id
    }
    this.cache = init.cache || 'default'
    this.destination = init.destination || ''
    this.integrity = init.integrity || ''
    this.keepalive = init.keepalive || false
    this.mode = init.mode || 'cors'
    this.priority = init.priority || 'auto'
    this.redirect = init.redirect || 'follow'
    this.referrer = init.referrer || ''
    this.referrerPolicy = init.referrerPolicy || 'no-referrer'

    /**
     * @todo @fixme This is also triggered twice because of RestRequest
     * extending MockedRequest.
     *
     * 1. MockedRequest created in "parseWorkerRequest", request cookies
     * parsed and hydrated.
     * 2. Then, RestRequest is created during request handler lookup,
     * and since it does "super()", it triggers this constructor,
     * which triggers the same cookie parsing on the already parsed cookies.
     */
    this.cookies = init.cookies || this.getCookies()
  }

  /**
   * Get plain string request body.
   *
   * @deprecated - Use `req.text()`, `req.json()` or `req.arrayBuffer()`
   * to read the request body as a plain text, JSON, or ArrayBuffer.
   */
  public get body(): RequestBody {
    const text = decodeBuffer(this['_body'])

    /**
     * @deprecated
     * @fixme Remove this assumption and let the users read
     * request body explicitly using ".json()"/".text()"/".arrayBuffer()".
     */
    // Parse the request's body based on the "Content-Type" header.
    const body = parseBody(text, this.headers)

    if (isStringEqual(this.method, 'GET') && body === '') {
      return undefined as RequestBody
    }

    return body as RequestBody
  }

  /**
   * Bypass the intercepted request.
   * This will make a call to the actual endpoint requested.
   */
  public passthrough(): MockedResponse<null> {
    return {
      // Constructing a dummy "101 Continue" mocked response
      // to keep the return type of the resolver consistent.
      status: 101,
      statusText: 'Continue',
      headers: new Headers(),
      body: null,
      // Setting "passthrough" to true will signal the response pipeline
      // to perform this intercepted request as-is.
      passthrough: true,
      once: false,
    }
  }

  private getCookies(): Record<string, string> {
    // Parse the cookies passed in the original request "cookie" header.
    const requestCookiesString = this.headers.get('cookie')
    const ownCookies = requestCookiesString
      ? cookieUtils.parse(requestCookiesString)
      : {}

    /**
     * Really, needs to be addressed in "@mswjs/cookies".
     * @see https://github.com/mswjs/cookies/issues/19
     */
    store.hydrate()

    const cookiesFromStore = Array.from(
      store.get({ ...this, url: this.url.href })?.entries(),
    ).reduce((cookies, [name, { value }]) => {
      return Object.assign(cookies, { [name.trim()]: value })
    }, {})

    // Get existing document cookies that are applicable
    // to this request based on its "credentials" policy.
    const cookiesFromDocument = getRequestCookies(this)

    const forwardedCookies = {
      ...cookiesFromDocument,
      ...cookiesFromStore,
    }

    for (const [name, value] of Object.entries(forwardedCookies)) {
      this.headers.append('cookie', `${name}=${value}`)
    }

    return {
      ...forwardedCookies,
      ...ownCookies,
    }
  }
}
