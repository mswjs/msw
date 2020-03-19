import { Mask } from '../composeMocks'
import { ResponseComposition, MockedResponse } from '../response'

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

export type ResponseResolver<ContextType = any> = (
  req: MockedRequest,
  res: ResponseComposition,
  context: ContextType,
) => Promise<MockedResponse> | MockedResponse

export interface RequestHandler<ContextType = any> {
  mask?: Mask
  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: MockedRequest) => boolean
  resolver: ResponseResolver<ContextType>
  defineContext: (req: MockedRequest) => ContextType
}

export default null
