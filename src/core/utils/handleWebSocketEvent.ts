import { RequestHandler } from '../handlers/RequestHandler'
import {
  WebSocketHandler,
  kDefaultPrevented,
  kDispatchEvent,
} from '../handlers/WebSocketHandler'
import { webSocketInterceptor } from '../ws/webSocketInterceptor'

export function handleWebSocketEvent(
  getCurrentHandlers: () => Array<RequestHandler | WebSocketHandler>,
) {
  webSocketInterceptor.on('connection', (connection) => {
    const handlers = getCurrentHandlers()
    const connectionEvent = new MessageEvent('connection', {
      data: connection,
      /**
       * @note This message event should be marked as "cancelable"
       * to have its default prevented using "event.preventDefault()".
       * There's a bug in Node.js that breaks the "cancelable" flag.
       * @see https://github.com/nodejs/node/issues/51767
       */
    })

    Object.defineProperty(connectionEvent, kDefaultPrevented, {
      enumerable: false,
      writable: true,
      value: false,
    })

    // Iterate over the handlers and forward the connection
    // event to WebSocket event handlers. This is equivalent
    // to dispatching that event onto multiple listeners.
    for (const handler of handlers) {
      if (handler instanceof WebSocketHandler) {
        handler[kDispatchEvent](connectionEvent)
      }
    }

    // If none of the "ws" handlers matched,
    // establish the WebSocket connection as-is.
    if (!Reflect.get(connectionEvent, kDefaultPrevented)) {
      connection.server.connect()
      connection.client.addEventListener('message', (event) => {
        connection.server.send(event.data)
      })
    }
  })
}
