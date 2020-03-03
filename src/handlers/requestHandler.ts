import { Mask } from '../composeMocks'
import { ResponseComposition, MockedResponse } from '../response'

export interface MockedRequest {
  url: Request['url']
  method: Request['method']
  headers: Request['headers']
  mode: Request['mode']
  credentials: Request['credentials']
  redirect: Request['redirect']
  referrer: Request['referrer']
  referrerPolicy: Request['referrerPolicy']
  body: Record<string, any> | string
  params: RequestParams
}

export type RequestParams = {
  [paramName: string]: any
}

export type ResponseResolver<ContextType = any> = (
  req: MockedRequest,
  res: ResponseComposition,
  context: ContextType,
) => MockedResponse

export interface RequestHandler<ContextType = any> {
  mask?: Mask
  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: MockedRequest) => boolean
  defineContext: (req: MockedRequest) => ContextType
  resolver: ResponseResolver<ContextType>
}

export default null
