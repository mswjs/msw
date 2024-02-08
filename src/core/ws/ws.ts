import { WebSocketHandler } from '../handlers/WebSocketHandler'
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
  return new WebSocketHandler(url)
}

export const ws = {
  link: createWebSocketLinkHandler,
}
