import { DefaultBodyType, ResponseResolver } from './handlers/RequestHandler'
import {
  RESTMethods,
  RestContext,
  RestHandler,
  RestRequest,
} from './handlers/RestHandler'
import { Path, PathParams } from './utils/matching/matchRequestUrl'

function createRestHandler<Method extends RESTMethods | RegExp>(
  method: Method,
) {
  return <
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    Params extends PathParams<Params> = PathParams,
    ResponseBody extends DefaultBodyType = DefaultBodyType,
  >(
    path: Path,
    resolver: ResponseResolver<
      RestRequest<
        Method extends RESTMethods.HEAD | RESTMethods.GET
          ? never
          : RequestBodyType,
        Params
      >,
      RestContext,
      ResponseBody
    >,
  ) => {
    return new RestHandler(method, path, resolver)
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
