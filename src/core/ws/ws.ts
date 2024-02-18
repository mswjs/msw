import type {
  WebSocketClientConnectionProtocol,
  WebSocketData,
} from '@mswjs/interceptors/WebSocket'
import {
  WebSocketHandler,
  kEmitter,
  type WebSocketHandlerEventMap,
} from '../handlers/WebSocketHandler'
import type { Path } from '../utils/matching/matchRequestUrl'
import { webSocketInterceptor } from './webSocketInterceptor'
import { WebSocketClientManager } from './SerializedWebSocketClientConnection'

const wsBroadcastChannel = new BroadcastChannel('msw:ws-client-manager')

/**
 * Intercepts outgoing WebSocket connections to the given URL.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 * chat.on('connection', ({ client }) => {
 *   client.send('hello from server!')
 * })
 */
function createWebSocketLinkHandler(url: Path) {
  webSocketInterceptor.apply()
  const clientManager = new WebSocketClientManager(wsBroadcastChannel)

  return {
    clients: clientManager.clients,
    on<K extends keyof WebSocketHandlerEventMap>(
      event: K,
      listener: (...args: WebSocketHandlerEventMap[K]) => void,
    ): WebSocketHandler {
      const handler = new WebSocketHandler(url)

      // Add the connection event listener for when the
      // handler matches and emits a connection event.
      // When that happens, store that connection in the
      // set of all connections for reference.
      handler[kEmitter].on('connection', ({ client }) => {
        clientManager.addConnection(client)
      })

      // The "handleWebSocketEvent" function will invoke
      // the "run()" method on the WebSocketHandler.
      // If the handler matches, it will emit the "connection"
      // event. Attach the user-defined listener to that event.
      handler[kEmitter].on(event, listener)

      return handler
    },

    /**
     * Broadcasts the given data to all WebSocket clients.
     *
     * @example
     * const service = ws.link('wss://example.com')
     * service.on('connection', () => {
     *   service.broadcast('hello, everyone!')
     * })
     */
    broadcast(data: WebSocketData): void {
      // This will invoke "send()" on the immediate clients
      // in this runtime and post a message to the broadcast channel
      // to trigger send for the clients in other runtimes.
      this.broadcastExcept([], data)
    },

    /**
     * Broadcasts the given data to all WebSocket clients
     * except the ones provided in the `clients` argument.
     *
     * @example
     * const service = ws.link('wss://example.com')
     * service.on('connection', ({ client }) => {
     *   service.broadcastExcept(client, 'hi, the rest of you!')
     * })
     */
    broadcastExcept(
      clients:
        | WebSocketClientConnectionProtocol
        | Array<WebSocketClientConnectionProtocol>,
      data: WebSocketData,
    ): void {
      const ignoreClients = Array.prototype
        .concat(clients)
        .map((client) => client.id)

      clientManager.clients.forEach((otherClient) => {
        if (!ignoreClients.includes(otherClient.id)) {
          otherClient.send(data)
        }
      })
    },
  }
}

export const ws = {
  link: createWebSocketLinkHandler,
}
