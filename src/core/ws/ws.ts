import {
  WebSocketHandler,
  kEmitter,
  type WebSocketHandlerEventMap,
} from '../handlers/WebSocketHandler'
import type { Path } from '../utils/matching/matchRequestUrl'
import { webSocketInterceptor } from './webSocketInterceptor'

/**
 * Intercepts outgoing WebSocket connections to the given URL.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 * chat.on('connection', (connection) => {})
 */
function createWebSocketLinkHandler(url: Path) {
  webSocketInterceptor.apply()

  return {
    on<K extends keyof WebSocketHandlerEventMap>(
      event: K,
      listener: (...args: WebSocketHandlerEventMap[K]) => void,
    ): WebSocketHandler {
      const handler = new WebSocketHandler(url)

      // The "handleWebSocketEvent" function will invoke
      // the "run()" method on the WebSocketHandler.
      // If the handler matches, it will emit the "connection"
      // event. Attach the user-defined listener to that event.
      handler[kEmitter].on(event, listener)

      return handler
    },
  }
}

export const ws = {
  link: createWebSocketLinkHandler,
}
