import { Headers } from 'headers-utils'
import { MockedResponse, response, ResponseComposition } from '../response'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { status } from '../context/status'
import { set } from '../context/set'
import { delay } from '../context/delay'
import { fetch } from '../context/fetch'

export const defaultContext = {
  status,
  set,
  delay,
  fetch,
}

export type DefaultRequestMultipartBody = Record<
  string,
  string | File | (string | File)[]
>

export type DefaultRequestBody =
  | Record<string, any>
  | DefaultRequestMultipartBody
  | string
  | undefined

export interface MockedRequest<Body = DefaultRequestBody> {
  id: string
  url: URL
  method: Request['method']
  headers: Headers
  cookies: Record<string, string>
  mode: Request['mode']
  keepalive: Request['keepalive']
  cache: Request['cache']
  destination: Request['destination']
  integrity: Request['integrity']
  credentials: Request['credentials']
  redirect: Request['redirect']
  referrer: Request['referrer']
  referrerPolicy: Request['referrerPolicy']
  body: Body
  bodyUsed: Request['bodyUsed']
}

interface RequestHandlerDefaultInfo {
  callFrame?: string
}

type RequestHandlerInfo<ExtraInfo extends Record<string, any>> = {
  header: string
} & ExtraInfo

type ContextMap = Record<string, (...args: any[]) => any>

export type ResponseResolverReturnType<R> = R | undefined | void
export type AsyncResponseResolverReturnType<R> =
  | Promise<ResponseResolverReturnType<R>>
  | ResponseResolverReturnType<R>
  | Generator<
      ResponseResolverReturnType<R> | Promise<ResponseResolverReturnType<R>>,
      ResponseResolverReturnType<R> | Promise<ResponseResolverReturnType<R>>,
      ResponseResolverReturnType<R> | Promise<ResponseResolverReturnType<R>>
    >

/**
 * Check an AsyncResponseResolverReturnType to see if
 * it is actually an iterable, which indicates it's a generator.
 */
function resolverResultIsGenerator<R>(
  resolver: AsyncResponseResolverReturnType<R>,
): resolver is Generator<
  ResponseResolverReturnType<R>,
  ResponseResolverReturnType<R>,
  ResponseResolverReturnType<R>
> {
  if (!resolver) return false
  return typeof (resolver as Generator<unknown>)[Symbol.iterator] == 'function'
}

export type ResponseResolver<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext,
  BodyType = any
> = (
  req: RequestType,
  res: ResponseComposition<BodyType>,
  context: ContextType,
) => AsyncResponseResolverReturnType<MockedResponse<BodyType>>

export interface RequestHandlerOptions<HandlerInfo> {
  info: RequestHandlerInfo<HandlerInfo>
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
  HandlerInfo extends Record<string, any> = Record<string, any>,
  Request extends MockedRequest = MockedRequest,
  ParsedResult = any,
  PublicRequest extends MockedRequest = Request
> {
  public info: RequestHandlerDefaultInfo & RequestHandlerInfo<HandlerInfo>
  private ctx: ContextMap
  private resolverGenerator: null | Generator<
    ResponseResolverReturnType<any> | Promise<ResponseResolverReturnType<any>>,
    ResponseResolverReturnType<any> | Promise<ResponseResolverReturnType<any>>,
    ResponseResolverReturnType<any> | Promise<ResponseResolverReturnType<any>>
  >
  private resolverGeneratorIsDone: boolean
  public shouldSkip: boolean
  protected resolver: ResponseResolver<any, any>

  constructor(options: RequestHandlerOptions<HandlerInfo>) {
    this.shouldSkip = false
    this.resolverGenerator = null
    this.resolverGeneratorIsDone = false
    this.ctx = options.ctx || defaultContext
    this.resolver = options.resolver

    const callFrame = getCallFrame()

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
  ): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(
    request: Request,
    response: any,
    handler: this,
    parsedResult: ParsedResult,
  ): void

  /**
   * Parse the captured request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  parse(_request: MockedRequest): ParsedResult {
    return null as any
  }

  /**
   * Test if this handler matches the given request.
   */
  public test(request: MockedRequest): boolean {
    return this.predicate(request, this.parse(request))
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
  ): Promise<RequestHandlerExecutionResult<PublicRequest> | null> {
    if (this.resolverGeneratorIsDone) {
      this.shouldSkip = true
    }
    if (this.shouldSkip) {
      return null
    }

    const parsedResult = this.parse(request)
    const shouldIntercept = this.predicate(request, parsedResult)

    if (!shouldIntercept) {
      return null
    }

    const publicRequest = this.getPublicRequest(request, parsedResult)

    let mockedResponse

    const res =
      this.resolverGenerator ||
      (await this.resolver(publicRequest, response, this.ctx))

    // Check to see if the resolver is a generator (or any other iterable).
    // If it is, stash it and call `next` on it instead of running `this.resolver` again.
    if (resolverResultIsGenerator<AsyncResponseResolverReturnType<any>>(res)) {
      const { done, value } = res[Symbol.iterator]().next()
      mockedResponse = await value
      if (done) {
        // We want to set `this.shouldSkip` true *next time*, so we don't throw away
        // the final result.
        this.resolverGeneratorIsDone = true
      } else if (!this.resolverGenerator) {
        this.resolverGenerator = res
      }
    } else {
      mockedResponse = res
    }

    return this.createExecutionResult(
      parsedResult,
      publicRequest,
      mockedResponse,
    )
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
