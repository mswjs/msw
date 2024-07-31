import { invariant } from 'outvariant'
import type {
  WebSocketClientConnectionProtocol,
  WebSocketData,
} from '@mswjs/interceptors/WebSocket'
import {
  WebSocketHandler,
  kEmitter,
  type WebSocketHandlerEventMap,
} from './handlers/WebSocketHandler'
import { Path, isPath } from './utils/matching/matchRequestUrl'
import { WebSocketClientManager } from './ws/WebSocketClientManager'

function isBroadcastChannelWithUnref(
  channel: BroadcastChannel,
): channel is BroadcastChannel & NodeJS.RefCounted {
  return typeof Reflect.get(channel, 'unref') !== 'undefined'
}

const wsBroadcastChannel = new BroadcastChannel('msw:ws-client-manager')

if (isBroadcastChannelWithUnref(wsBroadcastChannel)) {
  // Allows the Node.js thread to exit if it is the only active handle in the event system.
  // https://nodejs.org/api/worker_threads.html#broadcastchannelunref
  wsBroadcastChannel.unref()
}

export type WebSocketLink = {
  /**
   * A set of all WebSocket clients connected
   * to this link.
   */
  clients: Set<WebSocketClientConnectionProtocol>

  on<EventType extends keyof WebSocketHandlerEventMap>(
    event: EventType,
    listener: (...args: WebSocketHandlerEventMap[EventType]) => void,
  ): WebSocketHandler

  /**
   * Broadcasts the given data to all WebSocket clients.
   *
   * @example
   * const service = ws.link('wss://example.com')
   * service.on('connection', () => {
   *   service.broadcast('hello, everyone!')
   * })
   */
  broadcast(data: WebSocketData): void

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
  ): void
}

/**
 * Intercepts outgoing WebSocket connections to the given URL.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 * chat.on('connection', ({ client }) => {
 *   client.send('hello from server!')
 * })
 */
function createWebSocketLinkHandler(url: Path): WebSocketLink {
  invariant(url, 'Expected a WebSocket server URL but got undefined')

  invariant(
    isPath(url),
    'Expected a WebSocket server URL to be a valid path but got %s',
    typeof url,
  )

  const clientManager = new WebSocketClientManager(wsBroadcastChannel, url)

  return {
    get clients() {
      return clientManager.clients
    },
    on(event, listener) {
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

    broadcast(data) {
      // This will invoke "send()" on the immediate clients
      // in this runtime and post a message to the broadcast channel
      // to trigger send for the clients in other runtimes.
      this.broadcastExcept([], data)
    },

    broadcastExcept(clients, data) {
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

/**
 * A namespace to intercept and mock WebSocket connections.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 *
 * @see {@link https://mswjs.io/docs/api/ws `ws` API reference}
 */
export const ws = {
  link: createWebSocketLinkHandler,
}
