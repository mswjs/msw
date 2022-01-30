import { DefaultBodyType } from './handlers/RequestHandler'
import {
  RESTMethods,
  RestHandler,
  RestResponseResolver,
} from './handlers/RestHandler'
import {
  Path,
  ExtractPathParams,
  DefaultParamsType,
} from './utils/matching/matchRequestUrl'

function createRestHandler<MethodType extends RESTMethods | RegExp>(
  method: MethodType,
) {
  return <
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    ParamsType extends DefaultParamsType = never,
    ResponseBodyType extends DefaultBodyType = DefaultBodyType,
    PathType extends Path = Path,
  >(
    path: PathType,
    resolver: RestResponseResolver<
      MethodType,
      RequestBodyType,
      ExtractPathParams<PathType>,
      ResponseBodyType
    >,
  ) => {
    return new RestHandler<
      MethodType,
      PathType,
      RequestBodyType,
      ResponseBodyType
    >(method, path, resolver as any)
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
