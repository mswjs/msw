import { Headers } from 'headers-utils'
import { MockedResponse, response, ResponseComposition } from '../response'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import { status } from '../context/status'
import { set } from '../context/set'
import { delay } from '../context/delay'
import { fetch } from '../context/fetch'
import { ResponseResolutionContext } from '../utils/getResponse'
import { SerializedResponse } from '../setupWorker/glossary'

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
  | number
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

export type ResponseResolverReturnType<ReturnType> =
  | ReturnType
  | undefined
  | void

export type MaybeAsyncResponseResolverReturnType<ReturnType> =
  | ResponseResolverReturnType<ReturnType>
  | Promise<ResponseResolverReturnType<ReturnType>>

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
  PublicRequest extends MockedRequest = Request,
> {
  public info: RequestHandlerDefaultInfo & RequestHandlerInfo<HandlerInfo>
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
