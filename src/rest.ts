import { Path } from 'node-match-path'
import { DefaultRequestBody, ResponseResolver } from './handlers/RequestHandler'
import {
  RESTMethods,
  RestContext,
  RestHandler,
  RestRequest,
  RequestParams,
} from './handlers/RestHandler'

function createRestHandler(method: RESTMethods) {
  return <
    RequestBodyType extends DefaultRequestBody = DefaultRequestBody,
    ResponseBody extends DefaultRequestBody = any,
    Params extends RequestParams = RequestParams,
  >(
    path: Path,
    resolver: ResponseResolver<
      RestRequest<RequestBodyType, Params>,
      RestContext,
      ResponseBody
    >,
  ) => {
    return new RestHandler(method, path, resolver)
  }
}

export const rest = {
  head: createRestHandler(RESTMethods.HEAD),
  get: createRestHandler(RESTMethods.GET),
  post: createRestHandler(RESTMethods.POST),
  put: createRestHandler(RESTMethods.PUT),
  delete: createRestHandler(RESTMethods.DELETE),
  patch: createRestHandler(RESTMethods.PATCH),
  options: createRestHandler(RESTMethods.OPTIONS),
}
