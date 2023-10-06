import { invariant } from 'outvariant'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import type { ResponseResolutionContext } from '../utils/getResponse'
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

export interface RequestHandlerDefaultInfo {
  header: string
}

export interface RequestHandlerInternalInfo {
  callFrame?: string
}

export type ResponseResolverReturnType<
  BodyType extends DefaultBodyType = undefined,
> =
  | (BodyType extends undefined ? Response : StrictResponse<BodyType>)
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
  response?: Response
}

export abstract class RequestHandler<
  HandlerInfo extends RequestHandlerDefaultInfo = RequestHandlerDefaultInfo,
  ParsedResult extends Record<string, any> | undefined = any,
  ResolverExtras extends Record<string, unknown> = any,
  HandlerOptions extends RequestHandlerOptions = RequestHandlerOptions,
> {
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
   */
  public async test(args: {
    request: Request
    resolutionContext?: ResponseResolutionContext
  }): Promise<boolean> {
    const parsedResult = await this.parse({
      request: args.request.clone(),
      resolutionContext: args.resolutionContext,
    })

    return this.predicate({
      request: args.request,
      parsedResult,
      resolutionContext: args.resolutionContext,
    })
  }

  protected extendInfo(_args: {
    request: Request
    parsedResult: ParsedResult
  }): ResolverExtras {
    return {} as ResolverExtras
  }

  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  public async run(args: {
    request: StrictRequest<any>
    resolutionContext?: ResponseResolutionContext
  }): Promise<RequestHandlerExecutionResult<ParsedResult> | null> {
    if (this.isUsed && this.options?.once) {
      return null
    }

    const mainRequestRef = args.request.clone()

    // Immediately mark the handler as used.
    // Can't await the resolver to be resolved because it's potentially
    // asynchronous, and there may be multiple requests hitting this handler.
    this.isUsed = true

    const parsedResult = await this.parse({
      request: mainRequestRef.clone(),
      resolutionContext: args.resolutionContext,
    })
    const shouldInterceptRequest = this.predicate({
      request: mainRequestRef.clone(),
      parsedResult,
      resolutionContext: args.resolutionContext,
    })

    if (!shouldInterceptRequest) {
      return null
    }

    // Create a response extraction wrapper around the resolver
    // since it can be both an async function and a generator.
    const executeResolver = this.wrapResolver(this.resolver)

    const resolverExtras = this.extendInfo({
      request: args.request,
      parsedResult,
    })
    const mockedResponse = (await executeResolver({
      ...resolverExtras,
      request: args.request,
    })) as Response

    const executionResult = this.createExecutionResult({
      // Pass the cloned request to the result so that logging
      // and other consumers could read its body once more.
      request: mainRequestRef,
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
          return this.resolverGeneratorResult.clone()
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
    parsedResult: ParsedResult
    response?: Response
  }): RequestHandlerExecutionResult<ParsedResult> {
    return {
      handler: this,
      request: args.request,
      response: args.response,
      parsedResult: args.parsedResult,
    }
  }
}
