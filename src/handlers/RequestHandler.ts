import { Headers } from 'headers-polyfill'
import {
  MaybePromise,
  MockedResponse,
  response,
  ResponseComposition,
} from '../response'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import { status } from '../context/status'
import { set } from '../context/set'
import { delay } from '../context/delay'
import { fetch } from '../context/fetch'
import { ResponseResolutionContext } from '../utils/getResponse'
import { SerializedResponse } from '../setupWorker/glossary'
import { IsomorphicRequest } from '@mswjs/interceptors'
import { decodeBuffer } from '@mswjs/interceptors/lib/utils/bufferUtils'
import { parseBody } from '../utils/request/parseBody'

export type DefaultContext = {
  status: typeof status
  set: typeof set
  delay: typeof delay
  fetch: typeof fetch
}

export const defaultContext: DefaultContext = {
  status,
  set,
  delay,
  fetch,
}

export type DefaultRequestMultipartBody = Record<
  string,
  string | File | (string | File)[]
>

export type DefaultBodyType =
  | Record<string, any>
  | DefaultRequestMultipartBody
  | string
  | number
  | boolean
  | null
  | undefined

export interface MockRequestInit {
  mode?: Request['mode']
  keepalive?: Request['keepalive']
  cache?: Request['cache']
  destination?: Request['destination']
  integrity?: Request['integrity']
  redirect?: Request['redirect']
  referrer?: Request['referrer']
  referrerPolicy?: Request['referrerPolicy']
}

export class MockedRequest extends IsomorphicRequest {
  public readonly cookies: Record<string, string> = {}
  public readonly passthrough = passthrough

  public readonly mode: Request['mode']
  public readonly keepalive: Request['keepalive']
  public readonly cache: Request['cache']
  public readonly destination: Request['destination']
  public readonly integrity: Request['integrity']
  public readonly redirect: Request['redirect']
  public readonly referrer: Request['referrer']
  public readonly referrerPolicy: Request['referrerPolicy']

  constructor(
    isomorphicRequest: IsomorphicRequest,
    init: MockRequestInit = {},
  ) {
    super(isomorphicRequest)
    this.mode = init.mode || 'cors'
    this.keepalive = init.keepalive || false
    this.cache = init.cache || 'default'
    this.destination = init.destination || 'document'
    this.integrity = init.integrity || ''
    this.redirect = init.redirect || 'manual'
    this.referrer = init.referrer || ''
    this.referrerPolicy = init.referrerPolicy || 'no-referrer'
  }

  /**
   * @deprecated - use `json()`, `text()` or `arrayBuffer()` method
   */
  public get body(): DefaultBodyType {
    const text = decodeBuffer(this['_body'])
    return parseBody(text, this.headers)
  }
}

export interface RequestHandlerDefaultInfo {
  header: string
}

export interface RequestHandlerInternalInfo {
  callFrame?: string
}

type ContextMap = Record<string, (...args: any[]) => any>

export type ResponseResolverReturnType<ReturnType> =
  | ReturnType
  | undefined
  | void

export type MaybeAsyncResponseResolverReturnType<ReturnType> = MaybePromise<
  ResponseResolverReturnType<ReturnType>
>

export type AsyncResponseResolverReturnType<ReturnType> =
  | MaybeAsyncResponseResolverReturnType<ReturnType>
  | Generator<
      MaybeAsyncResponseResolverReturnType<ReturnType>,
      MaybeAsyncResponseResolverReturnType<ReturnType>,
      MaybeAsyncResponseResolverReturnType<ReturnType>
    >

export type ResponseResolver<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext,
  BodyType = any,
> = (
  req: RequestType,
  res: ResponseComposition<BodyType>,
  context: ContextType,
) => AsyncResponseResolverReturnType<MockedResponse<BodyType>>

export interface RequestHandlerOptions<HandlerInfo> {
  info: HandlerInfo
  resolver: ResponseResolver<any, any>
  ctx?: ContextMap
}

export interface RequestHandlerExecutionResult<PublicRequestType> {
  handler: RequestHandler
  parsedResult: any
  request: PublicRequestType
  response?: MockedResponse
}

export abstract class RequestHandler<
  HandlerInfo extends RequestHandlerDefaultInfo = RequestHandlerDefaultInfo,
  Request extends MockedRequest = MockedRequest,
  ParsedResult = any,
  PublicRequest extends MockedRequest = Request,
> {
  public info: HandlerInfo & RequestHandlerInternalInfo
  public shouldSkip: boolean

  private ctx: ContextMap
  private resolverGenerator?: Generator<
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>
  >
  private resolverGeneratorResult?: MaybeAsyncResponseResolverReturnType<any>

  protected resolver: ResponseResolver<any, any>

  constructor(options: RequestHandlerOptions<HandlerInfo>) {
    this.shouldSkip = false
    this.ctx = options.ctx || defaultContext
    this.resolver = options.resolver

    const callFrame = getCallFrame(new Error())

    this.info = {
      ...options.info,
      callFrame,
    }
  }

  /**
   * Determine if the captured request should be mocked.
   */
  abstract predicate(
    request: MockedRequest,
    parsedResult: ParsedResult,
    resolutionContext?: ResponseResolutionContext,
  ): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(
    request: Request,
    response: SerializedResponse<any>,
    handler: this,
    parsedResult: ParsedResult,
  ): void

  /**
   * Parse the captured request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  parse(
    _request: MockedRequest,
    _resolutionContext?: ResponseResolutionContext,
  ): ParsedResult {
    return null as any
  }

  /**
   * Test if this handler matches the given request.
   */
  public test(
    request: MockedRequest,
    resolutionContext?: ResponseResolutionContext,
  ): boolean {
    return this.predicate(
      request,
      this.parse(request, resolutionContext),
      resolutionContext,
    )
  }

  /**
   * Derive the publicly exposed request (`req`) instance of the response resolver
   * from the captured request and its parsed result.
   */
  protected getPublicRequest(
    request: MockedRequest,
    _parsedResult: ParsedResult,
  ) {
    return request as PublicRequest
  }

  public markAsSkipped(shouldSkip = true) {
    this.shouldSkip = shouldSkip
  }

  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  public async run(
    request: MockedRequest,
    resolutionContext?: ResponseResolutionContext,
  ): Promise<RequestHandlerExecutionResult<PublicRequest> | null> {
    if (this.shouldSkip) {
      return null
    }

    const parsedResult = this.parse(request, resolutionContext)
    const shouldIntercept = this.predicate(
      request,
      parsedResult,
      resolutionContext,
    )

    if (!shouldIntercept) {
      return null
    }

    const publicRequest = this.getPublicRequest(request, parsedResult)

    // Create a response extraction wrapper around the resolver
    // since it can be both an async function and a generator.
    const executeResolver = this.wrapResolver(this.resolver)
    const mockedResponse = await executeResolver(
      publicRequest,
      response,
      this.ctx,
    )

    return this.createExecutionResult(
      parsedResult,
      publicRequest,
      mockedResponse,
    )
  }

  private wrapResolver(
    resolver: ResponseResolver<any, any>,
  ): ResponseResolver<AsyncResponseResolverReturnType<any>, any> {
    return async (req, res, ctx) => {
      const result = this.resolverGenerator || (await resolver(req, res, ctx))

      if (isIterable<AsyncResponseResolverReturnType<any>>(result)) {
        const { value, done } = result[Symbol.iterator]().next()
        const nextResponse = await value

        // If the generator is done and there is no next value,
        // return the previous generator's value.
        if (!nextResponse && done) {
          return this.resolverGeneratorResult
        }

        if (!this.resolverGenerator) {
          this.resolverGenerator = result
        }

        this.resolverGeneratorResult = nextResponse
        return nextResponse
      }

      return result
    }
  }

  private createExecutionResult(
    parsedResult: ParsedResult,
    request: PublicRequest,
    response: any,
  ): RequestHandlerExecutionResult<PublicRequest> {
    return {
      handler: this,
      parsedResult: parsedResult || null,
      request,
      response: response || null,
    }
  }
}

/**
 * Bypass this intercepted request.
 * This will make a call to the actual endpoint requested.
 */
export function passthrough(): MockedResponse<null> {
  // Constructing a dummy "101 Continue" mocked response
  // to keep the return type of the resolver consistent.
  return {
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
