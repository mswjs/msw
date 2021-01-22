import {
  ResponseTransformer,
  response,
  MockedResponse,
} from '../../../response'
import { getCallFrame } from '../../internal/getCallFrame'
import {
  defaultContext,
  MockedRequest,
  ResponseResolver,
} from '../requestHandler'

interface RequestHandlerDefaultInfo {
  callFrame?: string
}

type RequestHandlerInfo<ExtraInfo extends Record<string, any>> = {
  header: string
} & ExtraInfo

type ContextMap = Record<string, (...args: any) => ResponseTransformer>

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
  RequestType extends MockedRequest = MockedRequest,
  ParsedResult = any,
  PublicRequestType extends MockedRequest = RequestType
> {
  public info: RequestHandlerDefaultInfo & RequestHandlerInfo<HandlerInfo>
  private ctx: ContextMap
  public shouldSkip: boolean
  protected resolver: ResponseResolver<any, any>

  constructor(options: RequestHandlerOptions<HandlerInfo>) {
    this.shouldSkip = false
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
  abstract predicate(request: RequestType, parsedResult: ParsedResult): boolean

  /**
   * Print out the successfully handled request.
   */
  abstract log(
    request: RequestType,
    res: any,
    handler: this,
    parsedResilt: ParsedResult,
  ): void

  /**
   * Parse the captured request to extract additional information from it.
   * Parsed result is then exposed to other methods of this request handler.
   */
  parse(request: RequestType): ParsedResult {
    return null as any
  }

  /**
   * Test if this handler matches the given request.
   */
  public test(request: RequestType): boolean {
    return this.predicate(request, this.parse(request))
  }

  /**
   * Derive the publicly exposed request (`req`) instance of the response resolver
   * from the captured request and its parsed result.
   */
  protected getPublicRequest(
    request: RequestType,
    parsedResult: ParsedResult,
  ): PublicRequestType {
    return request as any
  }

  public markAsSkipped(shouldSkip = true) {
    this.shouldSkip = shouldSkip
  }

  /**
   * Execute this request handler and produce a mocked response
   * using the given resolver function.
   */
  public async run(
    request: RequestType,
  ): Promise<RequestHandlerExecutionResult<PublicRequestType> | null> {
    if (this.shouldSkip) {
      return null
    }

    const parsedResult = this.parse(request)
    const shouldIntercept = this.predicate(request, parsedResult)

    if (!shouldIntercept) {
      return null
    }

    const publicRequest = this.getPublicRequest(request, parsedResult)
    const mockedResponse = await this.resolver(
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

  private createExecutionResult(
    parsedResult: ParsedResult,
    request: PublicRequestType,
    response: any,
  ): RequestHandlerExecutionResult<PublicRequestType> {
    return {
      handler: this,
      parsedResult: parsedResult || null,
      request,
      response: response || null,
    }
  }
}
