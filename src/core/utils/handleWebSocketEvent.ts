import { type Handler, WebSocketHandler } from '../handlers/WebSocketHandler'
import { webSocketInterceptor } from '../ws/webSocketInterceptor'

export function handleWebSocketEvent(handlers: Array<Handler>) {
  webSocketInterceptor.on('connection', (connection) => {
    const connectionEvent = new MessageEvent('connection', {
      data: connection,
      cancelable: true,
    })

    // Iterate over the handlers and forward the connection
    // event to WebSocket event handlers. This is equivalent
    // to dispatching that event onto multiple listeners.
    for (const handler of handlers) {
      if (handler instanceof WebSocketHandler) {
        // Never await the run function because event handlers
        // are side-effectful and don't block the event loop.
        handler.run(connectionEvent)
      }
    }

    // If none of the "ws" handlers matched,
    // establish the WebSocket connection as-is.
    if (!connectionEvent.defaultPrevented) {
      connection.server.connect()
      connection.client.on('message', (event) => {
        connection.server.send(event.data)
      })
    }
  })
}
