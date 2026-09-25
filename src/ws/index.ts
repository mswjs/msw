export {
  ws,
  type WebSocketLink,
  type WebSocketLinkOptions,
  type WebSocketLinkExtension,
  type WebSocketData,
  type WebSocketEventListener,
} from './ws'

export {
  WebSocketHandler,
  WebSocketConnectionEvent,
  type WebSocketHandlerOptions,
  type WebSocketHandlerEventMap,
  type WebSocketHandlerConnection,
} from './websocket-handler'

export {
  WebSocketExtension,
  type WebSocketExtensionContext,
  type WebSocketExtensionMessageContext,
  type WebSocketExtensionResult,
} from '@mswjs/interceptors/WebSocket'
