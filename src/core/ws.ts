import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { matchRequestUrl, type Path } from './utils/matching/matchRequestUrl'

/**
 * Intercept outgoing WebSocket connections to the given URL.
 * @param url WebSocket server URL
 */
function createWebSocketHandler(url: Path) {
  /**
   * @note I think the handler should initialize the interceptor.
   * This way, no WebSocket class stubs will be applied unless
   * you use a single "ws" handler. Interceptors are deduped.
   */
  const interceptor = new WebSocketInterceptor()
  interceptor.apply()

  /**
   * @todo Should this maybe live in the "setup" function
   * and then emit ONE intercepted connection to MANY "ws"
   * handlers? That way:
   * - The order of listeners still matters (consistency).
   * - The `.use()` makes sense.
   *
   * The challenge: only apply the interceptor when at least
   * ONE "ws.link()" has been created.
   */
  interceptor.on('connection', (connection) => {
    const match = matchRequestUrl(connection.client.url, url)

    // For WebSocket connections that don't match the given
    // URL predicate, open them as-is and forward all messages.
    if (!match.matches) {
      connection.server.connect()
      connection.client.on('message', (event) => {
        connection.server.send(event.data)
      })
      return
    }

    /** @todo Those that match, route to the public API */
  })

  /** @fixme Dispose of the interceptor. */

  return {
    /**
     * @fixme Don't expose these directly. The exposed interface
     * must be decoupled from the interceptor to support
     * "removeAllEvents" and such.
     */
    on: interceptor.on.bind(interceptor),
    off: interceptor.off.bind(interceptor),
    removeAllListeners: interceptor.removeAllListeners.bind(interceptor),
  }
}

export const ws = {
  link: createWebSocketHandler,
}

//
//

const chat = ws.link('wss://*.service.com')

chat.on('connection', ({ client }) => {
  client.on('message', (event) => {
    console.log(event.data)
    client.send('Hello from server!')
  })
})
