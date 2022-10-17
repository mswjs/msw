import { invariant } from 'outvariant'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import { type ResponseResolutionContext } from '../utils/getResponse'
import { type MaybePromise } from '../typeUtils'
import { StrictRequest, type StrictResponse } from '../utils/HttpResponse'

export type DefaultRequestMultipartBody = Record<
  string,
  string | File | Array<string | File>
>

export type DefaultBodyType =
  | Record<string, any>
  | DefaultRequestMultipartBody
  | string
  | number
  | boolean
  | null
  | undefined

export interface RequestHandlerDefaultInfo {
  header: string
}

export interface RequestHandlerInternalInfo {
  callFrame?: string
}

export type ResponseResolverReturnType<BodyType extends DefaultBodyType> =
  | Response
  | StrictResponse<BodyType>
  | undefined
  | void

export type MaybeAsyncResponseResolverReturnType<
  BodyType extends DefaultBodyType,
> = MaybePromise<ResponseResolverReturnType<BodyType>>

export type AsyncResponseResolverReturnType<BodyType extends DefaultBodyType> =
  | MaybeAsyncResponseResolverReturnType<BodyType>
  | Generator<
      MaybeAsyncResponseResolverReturnType<BodyType>,
      MaybeAsyncResponseResolverReturnType<BodyType>,
      MaybeAsyncResponseResolverReturnType<BodyType>
    >

export type ResponseResolverInfo<
  ResolverExtraInfo extends Record<string, unknown>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
> = {
  request: StrictRequest<RequestBodyType>
} & ResolverExtraInfo

export type ResponseResolver<
  ResolverExtraInfo extends Record<string, unknown> = Record<string, unknown>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
  ResponseBodyType extends DefaultBodyType = DefaultBodyType,
> = (
  info: ResponseResolverInfo<ResolverExtraInfo, RequestBodyType>,
) => AsyncResponseResolverReturnType<ResponseBodyType>

export interface RequestHandlerOptions<HandlerInfo>
  extends RequestHandlerPublicOptions {
  info: HandlerInfo
  resolver: ResponseResolver<any>
}

export interface RequestHandlerPublicOptions {
  once?: boolean
}

export interface RequestHandlerExecutionResult<
  ParsedResult extends Record<string, unknown>,
> {
  handler: RequestHandler
  parsedResult?: ParsedResult
  request: Request
  response?: Response
}

export abstract class RequestHandler<
  HandlerInfo extends RequestHandlerDefaultInfo = RequestHandlerDefaultInfo,
  ParsedResult extends Record<string, unknown> = any,
  ResolverExtras extends Record<string, unknown> = any,
> {
  public info: HandlerInfo & RequestHandlerInternalInfo
  /**
   * Indicates whether this request handler has been used
   * (its resolver has successfully executed).
   */
  public isUsed: boolean

  protected resolver: ResponseResolver<ResolverExtras, any>
  private resolverGenerator?: Generator<
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>
  >
  private resolverGeneratorResult?: ResponseResolverReturnType<any>
  private once: boolean

  constructor(options: RequestHandlerOptions<HandlerInfo>) {
    this.resolver = options.resolver
    this.once = options.once || false

    const callFrame = getCallFrame(new Error())

    this.info = {
      ...options.info,
      callFrame,
    }

    this.isUsed = false
  }

  /**
   * Determine if the captured request should be mocked.
   */
  abstract predicate(
    request: Request,
    parsedResult: ParsedResult,
    resolutionContext?: ResponseResolutionContext,
  ): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(
    request: Request,
    response: Response,
    parsedResult: ParsedResult,
  ): void

  /**
   * Parse the captured request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  async parse(
    _request: Request,
    _resolutionContext?: ResponseResolutionContext,
  ): Promise<ParsedResult> {
    return {} as ParsedResult
  }

  /**
   * Test if this handler matches the given request.
   */
  public async test(
    request: Request,
    resolutionContext?: ResponseResolutionContext,
  ): Promise<boolean> {
    return this.predicate(
      request,
      await this.parse(request.clone(), resolutionContext),
      resolutionContext,
    )
  }

  protected extendInfo(
    _request: Request,
    _parsedResult: ParsedResult,
  ): ResolverExtras {
    return {} as ResolverExtras
  }

  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  public async run(
    request: StrictRequest<any>,
    resolutionContext?: ResponseResolutionContext,
  ): Promise<RequestHandlerExecutionResult<ParsedResult> | null> {
    if (this.isUsed && this.once) {
      return null
    }

    // Immediately mark the handler as used.
    // Can't await the resolver to be resolved because it's potentially
    // asynchronous, and there may be multiple requests hitting this handler.
    this.isUsed = true

    const requestClone = request.clone()

    const parsedResult = await this.parse(requestClone, resolutionContext)
    const shouldInterceptRequest = this.predicate(
      requestClone,
      parsedResult,
      resolutionContext,
    )

    if (!shouldInterceptRequest) {
      return null
    }

    // Create a response extraction wrapper around the resolver
    // since it can be both an async function and a generator.
    const executeResolver = this.wrapResolver(this.resolver)

    const resolverExtras = this.extendInfo(requestClone, parsedResult)
    const mockedResponse = (await executeResolver({
      ...resolverExtras,
      request,
    })) as Response

    const executionResult = this.createExecutionResult(
      request,
      parsedResult,
      mockedResponse,
    )

    return executionResult
  }

  private wrapResolver(
    resolver: ResponseResolver<ResolverExtras>,
  ): ResponseResolver<ResolverExtras> {
    return async (
      info,
    ): Promise<StrictResponse<any> | Response | undefined | void> => {
      const result = this.resolverGenerator || (await resolver(info))

      if (isIterable<AsyncResponseResolverReturnType<any>>(result)) {
        // Immediately mark this handler as unused.
        // Only when the generator is done, the handler will be
        // considered used.
        this.isUsed = false

        const { value, done } = result[Symbol.iterator]().next()
        const nextResponse = await value

        if (done) {
          this.isUsed = true
        }

        // If the generator is done and there is no next value,
        // return the previous generator's value.
        if (!nextResponse && done) {
          invariant(
            this.resolverGeneratorResult,
            'Failed to returned a previously stored generator response: the value is not a valid Response.',
          )

          // Clone the previously stored response from the generator
          // so that it could be read again.
          return this.resolverGeneratorResult.clone()
        }

        if (!this.resolverGenerator) {
          this.resolverGenerator = result
        }

        // Also clone the response before storing it
        // so it could be read again.
        this.resolverGeneratorResult = nextResponse?.clone()
        return nextResponse
      }

      return result
    }
  }

  private createExecutionResult(
    request: Request,
    parsedResult: ParsedResult,
    response?: Response,
  ): RequestHandlerExecutionResult<ParsedResult> {
    return {
      handler: this,
      parsedResult,
      request,
      response,
    }
  }
}
