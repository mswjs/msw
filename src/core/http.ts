import {
  DefaultBodyType,
  RequestHandlerOptions,
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
    options: RequestHandlerOptions = {},
  ) => {
    return new HttpHandler(method, path, resolver, options)
  }
}

/**
 * A namespace to intercept and mock HTTP requests.
 *
 * @example
 * http.get('/user', resolver)
 * http.post('/post/:id', resolver)
 *
 * @see {@link https://mswjs.io/docs/api/http `http` API reference}
 */
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
