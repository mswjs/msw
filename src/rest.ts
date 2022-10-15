import {
  type RequestHandlerPublicOptions,
  type ResponseResolver,
} from './handlers/RequestHandler'
import {
  RESTMethods,
  type RestContext,
  RestHandler,
  RestRequestResolverExtras,
} from './handlers/RestHandler'
import { type Path, type PathParams } from './utils/matching/matchRequestUrl'

function createRestHandler<Method extends RESTMethods | RegExp>(
  method: Method,
) {
  return <
    Params extends PathParams<keyof Params> = PathParams,
    // ResponseBody extends DefaultBodyType = DefaultBodyType,
  >(
    path: Path,
    resolver: ResponseResolver<RestContext, RestRequestResolverExtras<Params>>,
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
