/**
 * The `msw/http` module.
 *
 * A convenience entrypoint for importing only the HTTP-related APIs.
 * These APIs are also available from the root `msw` module.
 */
export {
  http,
  type HttpRequestHandler,
  type HttpResponseResolver,
} from '#core/http'

export {
  HttpHandler,
  HttpMethods,
  type RequestQuery,
  type HttpRequestParsedResult,
  type HttpHandlerInfo,
  type HttpRequestResolverExtras,
  type HttpHandlerMethod,
  type HttpCustomPredicate,
} from '#core/handlers/HttpHandler'

export {
  HttpResponse,
  type HttpResponseInit,
  type StrictRequest,
  type StrictResponse,
} from '#core/HttpResponse'
