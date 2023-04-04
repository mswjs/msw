import {
  DefaultBodyType,
  RequestHandlerPublicOptions,
  ResponseResolver,
} from './handlers/RequestHandler'
import {
  RESTMethods,
  RestHandler,
  RestRequestResolverExtras,
} from './handlers/RestHandler'
import type { Path, PathParams } from './utils/matching/matchRequestUrl'

function createRestHandler<Method extends RESTMethods | RegExp>(
  method: Method,
) {
  return <
    Params extends PathParams<keyof Params> = PathParams,
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    ResponseBodyType extends DefaultBodyType = undefined,
  >(
    path: Path,
    resolver: ResponseResolver<
      RestRequestResolverExtras<Params>,
      RequestBodyType,
      ResponseBodyType
    >,
    options: RequestHandlerPublicOptions = {},
  ) => {
    return new RestHandler(method, path, resolver, options)
  }
}

export const rest = {
  all: createRestHandler(/.+/),
  head: createRestHandler(RESTMethods.HEAD),
  get: createRestHandler(RESTMethods.GET),
  post: createRestHandler(RESTMethods.POST),
  put: createRestHandler(RESTMethods.PUT),
  delete: createRestHandler(RESTMethods.DELETE),
  patch: createRestHandler(RESTMethods.PATCH),
  options: createRestHandler(RESTMethods.OPTIONS),
}
