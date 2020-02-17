import { Mask } from '../composeMocks'
import { MockedContext } from '../context'
import { ResponseComposition, MockedResponse } from '../response'

export enum RESTMethods {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  PATCH = 'PATCH',
  OPTIONS = 'OPTIONS',
  DELETE = 'DELETE',
}

export type RequestParams = {
  [paramName: string]: any
}

export type ResponseResolver = (
  req: Request & RequestParams,
  res: ResponseComposition,
  context: MockedContext,
) => MockedResponse

export interface RequestHandler {
  mask?: Mask
  /**
   * Predicate function that deciced whether a Request should be mocked.
   */
  predicate: (req: Request) => boolean
  resolver: ResponseResolver
}
