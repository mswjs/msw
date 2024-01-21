import { invariant } from 'outvariant'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import type { ResponseResolutionContext } from '../utils/executeHandlers'
import type { MaybePromise } from '../typeUtils'
import { StrictRequest, StrictResponse } from '..//HttpResponse'

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

export type JsonBodyType =
  | Record<string, any>
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

export type ResponseResolverReturnType<
  ResponseBodyType extends DefaultBodyType = undefined,
> =
  | ([ResponseBodyType] extends [undefined]
      ? Response
      : StrictResponse<ResponseBodyType>)
  | undefined
  | void

export type MaybeAsyncResponseResolverReturnType<
  ResponseBodyType extends DefaultBodyType,
> = MaybePromise<ResponseResolverReturnType<ResponseBodyType>>

export type AsyncResponseResolverReturnType<
  ResponseBodyType extends DefaultBodyType,
> = MaybePromise<
  | ResponseResolverReturnType<ResponseBodyType>
  | Generator<
      MaybeAsyncResponseResolverReturnType<ResponseBodyType>,
      MaybeAsyncResponseResolverReturnType<ResponseBodyType>,
      MaybeAsyncResponseResolverReturnType<ResponseBodyType>
    >
>

export type ResponseResolverInfo<
  ResolverExtraInfo extends Record<string, unknown>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
> = {
  request: StrictRequest<RequestBodyType>
  requestId: string
} & ResolverExtraInfo

export type ResponseResolver<
  ResolverExtraInfo extends Record<string, unknown> = Record<string, unknown>,
  RequestBodyType extends DefaultBodyType = DefaultBodyType,
  ResponseBodyType extends DefaultBodyType = undefined,
> = (
  info: ResponseResolverInfo<ResolverExtraInfo, RequestBodyType>,
) => AsyncResponseResolverReturnType<ResponseBodyType>

export interface RequestHandlerArgs<
  HandlerInfo,
  HandlerOptions extends RequestHandlerOptions,
> {
  info: HandlerInfo
  resolver: ResponseResolver<any>
  options?: HandlerOptions
}

export interface RequestHandlerOptions {
  once?: boolean
}

export interface RequestHandlerExecutionResult<
  ParsedResult extends Record<string, unknown> | undefined,
> {
  handler: RequestHandler
  parsedResult?: ParsedResult
  request: Request
  requestId: string
  response?: Response
}

export abstract class RequestHandler<
  HandlerInfo extends RequestHandlerDefaultInfo = RequestHandlerDefaultInfo,
  ParsedResult extends Record<string, any> | undefined = any,
  ResolverExtras extends Record<string, unknown> = any,
  HandlerOptions extends RequestHandlerOptions = RequestHandlerOptions,
> {
  static cache = new WeakMap<
    StrictRequest<DefaultBodyType>,
    StrictRequest<DefaultBodyType>
  >()

  public info: HandlerInfo & RequestHandlerInternalInfo
  /**
   * Indicates whether this request handler has been used
   * (its resolver has successfully executed).
   */
  public isUsed: boolean

  protected resolver: ResponseResolver<ResolverExtras, any, any>
  private resolverGenerator?: Generator<
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>,
    MaybeAsyncResponseResolverReturnType<any>
  >
  private resolverGeneratorResult?: Response | StrictResponse<any>
  private options?: HandlerOptions

  constructor(args: RequestHandlerArgs<HandlerInfo, HandlerOptions>) {
    this.resolver = args.resolver
    this.options = args.options

    const callFrame = getCallFrame(new Error())

    this.info = {
      ...args.info,
      callFrame,
    }

    this.isUsed = false
  }

  /**
   * Determine if the intercepted request should be mocked.
   */
  abstract predicate(args: {
    request: Request
    parsedResult: ParsedResult
    resolutionContext?: ResponseResolutionContext
  }): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(args: {
    request: Request
    response: Response
    parsedResult: ParsedResult
  }): void

  /**
   * Parse the intercepted request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  async parse(_args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<ParsedResult> {
    return {} as ParsedResult
  }

  /**
   * Test if this handler matches the given request.
   *
   * This method is not used internally but is exposed
   * as a convenience method for consumers writing custom
   * handlers.
   */
  public async test(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<boolean> {
    const parsedResult = await this.parse({
      request: args.request,
      resolutionContext: args.resolutionContext,
    })

    return this.predicate({
      request: args.request,
      parsedResult,
      resolutionContext: args.resolutionContext,
    })
  }

  protected extendResolverArgs(_args: {
    request: Request
    parsedResult: ParsedResult
  }): ResolverExtras {
    return {} as ResolverExtras
  }

  // Clone the request instance before it's passed to the handler phases
  // and the response resolver so we can always read it for logging.
  // We only clone it once per request to avoid unnecessary overhead.
  private cloneRequestOrGetFromCache(
    request: StrictRequest<DefaultBodyType>,
  ): StrictRequest<DefaultBodyType> {
    const existingClone = RequestHandler.cache.get(request)

    if (typeof existingClone !== 'undefined') {
      return existingClone
    }

    const clonedRequest = request.clone()
    RequestHandler.cache.set(request, clonedRequest)

    return clonedRequest
  }

  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  public async run(args: {
    request: StrictRequest<any>
    requestId: string
    resolutionContext?: ResponseResolutionContext
  }): Promise<RequestHandlerExecutionResult<ParsedResult> | null> {
    if (this.isUsed && this.options?.once) {
      return null
    }

    // Clone the request.
    // If this is the first time MSW handles this request, a fresh clone
    // will be created and cached. Upon further handling of the same request,
    // the request clone from the cache will be reused to prevent abundant
    // "abort" listeners and save up resources on cloning.
    const requestClone = this.cloneRequestOrGetFromCache(args.request)

    const parsedResult = await this.parse({
      request: args.request,
      resolutionContext: args.resolutionContext,
    })
    const shouldInterceptRequest = this.predicate({
      request: args.request,
      parsedResult,
      resolutionContext: args.resolutionContext,
    })

    if (!shouldInterceptRequest) {
      return null
    }

    // Re-check isUsed, in case another request hit this handler while we were
    // asynchronously parsing the request.
    if (this.isUsed && this.options?.once) {
      return null
    }

    this.isUsed = true

    // Create a response extraction wrapper around the resolver
    // since it can be both an async function and a generator.
    const executeResolver = this.wrapResolver(this.resolver)

    const resolverExtras = this.extendResolverArgs({
      request: args.request,
      parsedResult,
    })

    const mockedResponsePromise = (
      executeResolver({
        ...resolverExtras,
        requestId: args.requestId,
        request: args.request,
      }) as Promise<Response>
    ).catch((errorOrResponse) => {
      // Allow throwing a Response instance in a response resolver.
      if (errorOrResponse instanceof Response) {
        return errorOrResponse
      }

      // Otherwise, throw the error as-is.
      throw errorOrResponse
    })

    const mockedResponse = await mockedResponsePromise

    const executionResult = this.createExecutionResult({
      // Pass the cloned request to the result so that logging
      // and other consumers could read its body once more.
      request: requestClone,
      requestId: args.requestId,
      response: mockedResponse,
      parsedResult,
    })

    return executionResult
  }

  private wrapResolver(
    resolver: ResponseResolver<ResolverExtras>,
  ): ResponseResolver<ResolverExtras> {
    return async (info): Promise<ResponseResolverReturnType<any>> => {
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
          return this.resolverGeneratorResult.clone() as StrictResponse<any>
        }

        if (!this.resolverGenerator) {
          this.resolverGenerator = result
        }

        if (nextResponse) {
          // Also clone the response before storing it
          // so it could be read again.
          this.resolverGeneratorResult = nextResponse?.clone()
        }

        return nextResponse
      }

      return result
    }
  }

  private createExecutionResult(args: {
    request: Request
    requestId: string
    parsedResult: ParsedResult
    response?: Response
  }): RequestHandlerExecutionResult<ParsedResult> {
    return {
      handler: this,
      request: args.request,
      requestId: args.requestId,
      response: args.response,
      parsedResult: args.parsedResult,
    }
  }
}
