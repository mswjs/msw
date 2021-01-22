import { Mask } from './setupWorker/glossary'
import {
  DefaultRequestBodyType,
  RequestParams,
  ResponseResolver,
} from './utils/handlers/requestHandler'
import {
  RESTMethods,
  RestContext,
  RestHandler,
  RestPublicRequestType,
} from './utils/handlers/2.0/RestHandler'

function createRestHandler(method: RESTMethods) {
  return <
    RequestBodyType = DefaultRequestBodyType,
    ResponseBodyType = any,
    RequestParamsType extends RequestParams = RequestParams
  >(
    mask: Mask,
    resolver: ResponseResolver<
      /**
       * @todo Pass params type.
       */
      RestPublicRequestType<RequestParamsType>,
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
