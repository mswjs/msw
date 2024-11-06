import type { WebSocketConnectionData } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import { RequestHandler } from '../handlers/RequestHandler'
import { WebSocketHandler, kDispatchEvent } from '../handlers/WebSocketHandler'
import { webSocketInterceptor } from './webSocketInterceptor'
import {
  onUnhandledRequest,
  UnhandledRequestStrategy,
} from '../utils/request/onUnhandledRequest'
import { isHandlerKind } from '../utils/internal/isHandlerKind'

interface HandleWebSocketEventOptions {
  getUnhandledRequestStrategy: () => UnhandledRequestStrategy
  getHandlers: () => Array<RequestHandler | WebSocketHandler>
  onMockedConnection: (connection: WebSocketConnectionData) => void
  onPassthroughConnection: (onnection: WebSocketConnectionData) => void
}

export function handleWebSocketEvent(options: HandleWebSocketEventOptions) {
  webSocketInterceptor.on('connection', async (connection) => {
    const handlers = options.getHandlers()

    const connectionEvent = new MessageEvent('connection', {
      data: connection,
    })

    // First, filter only those WebSocket handlers that
    // match the "ws.link()" endpoint predicate. Don't dispatch
    // anything yet so the logger can be attached to the connection
    // before it potentially sends events.
    const matchingHandlers: Array<WebSocketHandler> = []

    for (const handler of handlers) {
      if (
        isHandlerKind('EventHandler')(handler) &&
        handler.predicate({
          event: connectionEvent,
          parsedResult: handler.parse({
            event: connectionEvent,
          }),
        })
      ) {
        matchingHandlers.push(handler)
      }
    }

    if (matchingHandlers.length > 0) {
      options?.onMockedConnection(connection)

      // Iterate over the handlers and forward the connection
      // event to WebSocket event handlers. This is equivalent
      // to dispatching that event onto multiple listeners.
      for (const handler of matchingHandlers) {
        handler[kDispatchEvent](connectionEvent)
      }
    } else {
      // Construct a request representing this WebSocket connection.
      const request = new Request(connection.client.url, {
        headers: {
          upgrade: 'websocket',
          connection: 'upgrade',
        },
      })
      await onUnhandledRequest(
        request,
        options.getUnhandledRequestStrategy(),
      ).catch((error) => {
        const errorEvent = new Event('error')
        Object.defineProperty(errorEvent, 'cause', {
          enumerable: true,
          configurable: false,
          value: error,
        })
        connection.client.socket.dispatchEvent(errorEvent)
      })

      options?.onPassthroughConnection(connection)

      // If none of the "ws" handlers matched,
      // establish the WebSocket connection as-is.
      connection.server.connect()
    }
  })
}
