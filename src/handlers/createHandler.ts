import * as R from 'ramda'
import { Mask } from '../composeMocks'
import { MockedContext } from '../context'
import { ResponseComposition, MockedResponse } from '../response'
import matchPath, { FullMatch, MatchPathOptions } from '../utils/matchPath'

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

export type ResponseHandler = (
  method: RESTMethods,
  mask: Mask,
  resolver: ResponseResolver,
) => SchemaEntryGetter

export type SchemaEntryGetter = () => [RESTMethods, SchemaEntryBody]

export type SchemaEntry<Body> = Record<RESTMethods, Body>

export interface SchemaEntryBody {
  mask: Mask
  match: (url: string) => FullMatch
  resolver: ResponseResolver
}

const createHandler = R.curry(
  (
    method: RESTMethods,
    mask: Mask,
    resolver: ResponseResolver,
  ): SchemaEntryGetter => {
    return () => [
      method,
      {
        mask,
        match: function(url: string, matchOptions: MatchPathOptions = {}) {
          return matchPath(url, { ...matchOptions, path: this.mask })
        },
        resolver,
      },
    ]
  },
)

export default createHandler
