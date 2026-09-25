/* HTTP handlers */
export { RequestHandler } from './handlers/request-handler'
export { http } from '#http/http'
export { HttpHandler, HttpMethods } from '#http/http-handler'

/* WebSocket handler */
export {
  ws,
  type WebSocketLink,
  type WebSocketLinkOptions,
  type WebSocketData,
  type WebSocketEventListener,
} from '#ws/ws'
export {
  WebSocketHandler,
  WebSocketConnectionEvent,
  type WebSocketHandlerOptions,
  type WebSocketHandlerEventMap,
  type WebSocketHandlerConnection,
} from '#ws/websocket-handler'
/* Server-Sent Events */
export {
  sse,
  type ServerSentEventRequestHandler,
  type ServerSentEventResolver,
  type ServerSentEventResolverExtras,
  type ServerSentEventMessage,
} from '#sse/sse'

/* Utils */
export { matchRequestUrl } from './utils/matching/match-request-url'
export { getResponse } from './get-response'
export { getCleanUrlString } from '#utils/get-clean-url-string'

/**
 * Type definitions.
 */

export type { AnyHandler } from './experimental/handlers-controller'

export type { SharedOptions } from './shared-options'

export type {
  ResponseResolver,
  ResponseResolverReturnType,
  AsyncResponseResolverReturnType,
  RequestHandlerOptions,
  DefaultBodyType,
  DefaultRequestMultipartBody,
  JsonBodyType,
  ResponseResolverInfo,
} from './handlers/request-handler'

export type {
  RequestQuery,
  HttpRequestParsedResult,
  HttpHandlerInfo,
  HttpRequestResolverExtras,
  HttpHandlerMethod,
  HttpCustomPredicate,
} from '#http/http-handler'
export type { HttpRequestHandler, HttpResponseResolver } from '#http/http'

export type {
  Path,
  PathParams,
  Match,
} from './utils/matching/match-request-url'
export type { ResponseResolutionContext } from './utils/execute-handlers'

export {
  HttpResponse,
  type HttpResponseInit,
  type StrictRequest,
} from '#http/http-response'
export { delay, type DelayMode } from '#utils/delay'
export { bypass } from '#utils/bypass'
export { passthrough } from '#utils/passthrough'
export { isCommonAssetRequest } from '#utils/is-common-asset-request'
