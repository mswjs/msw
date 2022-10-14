import { invariant } from 'outvariant'
import { MaybePromise } from '../response'
import { getCallFrame } from '../utils/internal/getCallFrame'
import { isIterable } from '../utils/internal/isIterable'
import { status } from '../context/status'
import { set } from '../context/set'
import { delay } from '../context/delay'
import { type ResponseResolutionContext } from '../utils/getResponse'
import { type SerializedResponse } from '../setupWorker/glossary'

export type DefaultContext = {
  status: typeof status
  set: typeof set
  delay: typeof delay
}

export const defaultContext: DefaultContext = {
  status,
  set,
  delay,
}

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

type ContextMap = Record<string, (...args: Array<any>) => any>

export type ResponseResolverReturnType = Response | undefined | void

export type MaybeAsyncResponseResolverReturnType =
  MaybePromise<ResponseResolverReturnType>

export type AsyncResponseResolverReturnType =
  | MaybeAsyncResponseResolverReturnType
  | Generator<
      MaybeAsyncResponseResolverReturnType,
      MaybeAsyncResponseResolverReturnType,
      MaybeAsyncResponseResolverReturnType
    >

export type ResponseResolverInfo<
  ContextType,
  ResolverExtraInfo extends Record<string, unknown>,
> = {
  request: Request
  ctx: ContextType
} & ResolverExtraInfo

export type ResponseResolver<
  ContextType extends ContextMap = typeof defaultContext,
  ResolverExtraInfo extends Record<string, unknown> = Record<string, unknown>,
> = (
  info: ResponseResolverInfo<ContextType, ResolverExtraInfo>,
) => AsyncResponseResolverReturnType

export interface RequestHandlerOptions<HandlerInfo> {
  info: HandlerInfo
  resolver: ResponseResolver<any, any>
  ctx?: ContextMap
}

export interface RequestHandlerExecutionResult {
  handler: RequestHandler
  parsedResult: any | undefined
  request: Request
  response?: Response
}

export abstract class RequestHandler<
  HandlerInfo extends RequestHandlerDefaultInfo = RequestHandlerDefaultInfo,
  ParsedResult extends Record<string, unknown> | undefined = any,
  ResolverExtras extends Record<string, unknown> = any,
> {
  public info: HandlerInfo & RequestHandlerInternalInfo
  public shouldSkip: boolean

  private ctx: ContextMap
  private resolverGenerator?: Generator<
    MaybeAsyncResponseResolverReturnType,
    MaybeAsyncResponseResolverReturnType,
    MaybeAsyncResponseResolverReturnType
  >
  private resolverGeneratorResult?: ResponseResolverReturnType

  protected resolver: ResponseResolver<any, ResolverExtras>

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
    request: Request,
    parsedResult: ParsedResult,
    resolutionContext?: ResponseResolutionContext,
  ): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(
    request: Request,
    response: SerializedResponse<any>,
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

  public markAsSkipped(shouldSkip = true): void {
    this.shouldSkip = shouldSkip
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
    request: Request,
    resolutionContext?: ResponseResolutionContext,
  ): Promise<RequestHandlerExecutionResult | null> {
    if (this.shouldSkip) {
      return null
    }

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
    const mockedResponse = await executeResolver({
      ...resolverExtras,
      request,
      ctx: this.ctx,
    })

    return this.createExecutionResult(
      request,
      parsedResult,
      // @ts-ignore @todo
      mockedResponse as any,
    )
  }

  private wrapResolver(
    resolver: ResponseResolver<any, any>,
  ): ResponseResolver<any, ResolverExtras> {
    return async (info): Promise<Response | undefined | void> => {
      const result = this.resolverGenerator || (await resolver(info))

      if (isIterable<AsyncResponseResolverReturnType>(result)) {
        const { value, done } = result[Symbol.iterator]().next()
        const nextResponse = await value

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
  ): RequestHandlerExecutionResult {
    return {
      handler: this,
      parsedResult,
      request,
      response,
    }
  }
}

/**
 * Bypass this intercepted request.
 * This will make a call to the actual endpoint requested.
 */
export function passthrough(): Response {
  // Constructing a "101 Continue" mocked response
  // to keep the return type of the resolver consistent.
  return new Response(null, { status: 101 })

  // return {
  //   status: 101,
  //   statusText: 'Continue',
  //   headers: new Headers(),
  //   body: null,
  //   // Setting "passthrough" to true will signal the response pipeline
  //   // to perform this intercepted request as-is.
  //   passthrough: true,
  //   once: false,
  // }
}
