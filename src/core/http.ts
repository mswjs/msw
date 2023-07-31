import {
  DefaultBodyType,
  RequestHandlerPublicOptions,
  ResponseResolver,
} from './handlers/RequestHandler'
import {
  HttpMethods,
  HttpHandler,
  HttpRequestResolverExtras,
} from './handlers/HttpHandler'
import type { Path, PathParams } from './utils/matching/matchRequestUrl'

function createHttpHandler<Method extends HttpMethods | RegExp>(
  method: Method,
) {
  return <
    Params extends PathParams<keyof Params> = PathParams,
    RequestBodyType extends DefaultBodyType = DefaultBodyType,
    ResponseBodyType extends DefaultBodyType = undefined,
  >(
    path: Path,
    resolver: ResponseResolver<
      HttpRequestResolverExtras<Params>,
      RequestBodyType,
      ResponseBodyType
    >,
    options: RequestHandlerPublicOptions = {},
  ) => {
    return new HttpHandler(method, path, resolver, options)
  }
}

export const http = {
  all: createHttpHandler(/.+/),
  head: createHttpHandler(HttpMethods.HEAD),
  get: createHttpHandler(HttpMethods.GET),
  post: createHttpHandler(HttpMethods.POST),
  put: createHttpHandler(HttpMethods.PUT),
  delete: createHttpHandler(HttpMethods.DELETE),
  patch: createHttpHandler(HttpMethods.PATCH),
  options: createHttpHandler(HttpMethods.OPTIONS),
}
