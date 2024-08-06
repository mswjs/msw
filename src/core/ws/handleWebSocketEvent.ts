import type { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import { RequestHandler } from '../handlers/RequestHandler'
import { WebSocketHandler, kDispatchEvent } from '../handlers/WebSocketHandler'
import { webSocketInterceptor } from './webSocketInterceptor'

interface HandleWebSocketEventOptions {
  getHandlers: () => Array<RequestHandler | WebSocketHandler>
  onMockedConnection: (connection: WebSocketConnectionData) => void
  onPassthroughConnection: (onnection: WebSocketConnectionData) => void
}

export function handleWebSocketEvent(options: HandleWebSocketEventOptions) {
  webSocketInterceptor.on('connection', (connection) => {
    const handlers = options.getHandlers()

    const connectionEvent = new MessageEvent('connection', {
      data: connection,
    })

    // First, filter only those WebSocket handlers that
    // match the "ws.link()" endpoint predicate. Don't dispatch
    // anything yet so the logger can be attached to the connection
    // before it potentially sends events.
    const matchingHandlers = handlers.filter<WebSocketHandler>(
      (handler): handler is WebSocketHandler => {
        if (handler instanceof WebSocketHandler) {
          return handler.predicate({
            event: connectionEvent,
            parsedResult: handler.parse({
              event: connectionEvent,
            }),
          })
        }

        return false
      },
    )

    if (matchingHandlers.length > 0) {
      options?.onMockedConnection(connection)

      // Iterate over the handlers and forward the connection
      // event to WebSocket event handlers. This is equivalent
      // to dispatching that event onto multiple listeners.
      for (const handler of matchingHandlers) {
        handler[kDispatchEvent](connectionEvent)
      }
    } else {
      options?.onPassthroughConnection(connection)

      // If none of the "ws" handlers matched,
      // establish the WebSocket connection as-is.
      connection.server.connect()
    }
  })
}
