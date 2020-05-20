import { Headers } from 'headers-utils'
import { Mask, ResponseWithSerializedHeaders } from '../setupWorker/glossary'
import { ResponseComposition, MockedResponse } from '../response'
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

export interface MockedRequest {
  url: URL
  method: Request['method']
  headers: Headers
  mode: Request['mode']
  keepalive: Request['keepalive']
  cache: Request['cache']
  destination: Request['destination']
  integrity: Request['integrity']
  credentials: Request['credentials']
  redirect: Request['redirect']
  referrer: Request['referrer']
  referrerPolicy: Request['referrerPolicy']
  body: Record<string, any> | string
  bodyUsed: Request['bodyUsed']
  params: RequestParams
}

export type RequestQuery = {
  [queryName: string]: any
}

export type RequestParams = {
  [paramName: string]: any
}

export type ResponseResolver<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext
> = (
  req: RequestType,
  res: ResponseComposition,
  context: ContextType,
) => Promise<MockedResponse> | MockedResponse

export interface RequestHandler<
  RequestType = MockedRequest,
  ContextType = typeof defaultContext
> {
  mask?: Mask
  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: MockedRequest) => boolean
  resolver: ResponseResolver<RequestType, ContextType>
  defineContext?: (req: MockedRequest) => ContextType
  log: (
    req: MockedRequest,
    res: ResponseWithSerializedHeaders,
    handler: RequestHandler<RequestType, ContextType>,
  ) => void
}

export default null
