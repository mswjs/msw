import { Mask } from './setupWorker/glossary'
import {
  DefaultRequestBodyType,
  ResponseResolver,
} from './handlers/RequestHandler'
import {
  RESTMethods,
  RestContext,
  RestHandler,
  RestRequestType,
  RequestParams,
} from './handlers/RestHandler'

function createRestHandler(method: RESTMethods) {
  return <
    RequestBodyType extends DefaultRequestBodyType = DefaultRequestBodyType,
    ResponseBodyType extends DefaultRequestBodyType = any,
    RequestParamsType extends RequestParams = RequestParams
  >(
    mask: Mask,
    resolver: ResponseResolver<
      RestRequestType<RequestBodyType, RequestParamsType>,
      RestContext,
      ResponseBodyType
    >,
  ) => {
    return new RestHandler(method, mask, resolver)
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
