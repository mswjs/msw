import { Mask } from '../composeMocks'
import { MockedContext } from '../context'
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

export type ResponseResolver = (
  req: MockedRequest,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

export interface RequestHandler {
  mask?: Mask
  /**
   * Predicate function that decides whether a Request should be mocked.
   */
  predicate: (req: MockedRequest) => boolean
  resolver: ResponseResolver
}

export default null
