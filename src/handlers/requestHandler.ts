import { Mask } from '../composeMocks'
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
  url: Request['url']
  method: Request['method']
  headers: Request['headers']
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

export type RequestParams = {
  [paramName: string]: any
}

export type ResponseResolver<ContextType = typeof defaultContext> = (
  req: MockedRequest,
  res: ResponseComposition,
  context: ContextType,
) => Promise<MockedResponse> | MockedResponse

export interface RequestHandler<ContextType = typeof defaultContext> {
  mask?: Mask
  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: MockedRequest) => boolean
  resolver: ResponseResolver<ContextType>
  defineContext?: (req: MockedRequest) => ContextType
}

export default null
