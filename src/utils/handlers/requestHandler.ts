import { Headers } from 'headers-utils'
import { Mask, ResponseWithSerializedHeaders } from '../../setupWorker/glossary'
import { ResponseComposition, MockedResponse } from '../../response'
import { status } from '../../context/status'
import { set } from '../../context/set'
import { delay } from '../../context/delay'
import { fetch } from '../../context/fetch'

export const defaultContext = {
  status,
  set,
  delay,
  fetch,
}

export type DefaultRequestBodyType = Record<string, any> | string | undefined

export interface MockedRequest<
  BodyType = DefaultRequestBodyType,
  RequestParamsType = RequestParams
> {
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
  body: BodyType
  bodyUsed: Request['bodyUsed']
  params: RequestParamsType
}

export type RequestQuery = {
  [queryName: string]: any
}

export type RequestParams = {
  [paramName: string]: any
}

export type ResponseResolverReturnType<R> = R | undefined | void
export type AsyncResponseResolverReturnType<R> =
  | Promise<ResponseResolverReturnType<R>>
  | ResponseResolverReturnType<R>

export type ResponseResolver<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext,
  BodyType = any
> = (
  req: RequestType,
  res: ResponseComposition<BodyType>,
  context: ContextType,
) => AsyncResponseResolverReturnType<MockedResponse<BodyType>>

type RequestHandlerType = 'rest' | 'graphql'

export interface RequestHandlerMetaInfo<Type = RequestHandlerType> {
  type: Type
  header: string
  mask: Mask
  callFrame: string | undefined
}

export interface RequestHandler<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext,
  ParsedRequest = any,
  PublicRequest = RequestType,
  ResponseBodyType = any
> {
  /**
   * Parses a captured request to retrieve additional
   * information meant for internal usage in the request handler.
   */
  parse?: (req: RequestType) => ParsedRequest | null

  /**
   * Returns a modified request with necessary public properties appended.
   */
  getPublicRequest?: (
    req: RequestType,
    parsedRequest: ParsedRequest,
  ) => PublicRequest

  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: RequestType, parsedRequest: ParsedRequest) => boolean

  /**
   * Returns a mocked response object to the captured request.
   */
  resolver: ResponseResolver<RequestType, ContextType, ResponseBodyType>

  /**
   * Returns a map of context utility functions available
   * under the `ctx` argument of request handler.
   */
  defineContext?: (req: PublicRequest) => ContextType

  /**
   * Prints out a mocked request/response information
   * upon each request capture into browser's console.
   */
  log: (
    req: PublicRequest,
    res: ResponseWithSerializedHeaders,
    handler: RequestHandler<
      RequestType,
      ContextType,
      ParsedRequest,
      PublicRequest,
      ResponseBodyType
    >,
    parsedRequest: ParsedRequest,
  ) => void

  /**
   * Describes whether this request handler should be skipped
   * when dealing with any subsequent matching requests.
   */
  shouldSkip?: boolean

  /**
   * Returns request handler's meta information used
   * when listing each current request handler.
   */
  getMetaInfo: () => RequestHandlerMetaInfo
}

export default null
