import { invariant } from 'outvariant'
import type { EventMap } from 'rettime'
import type {
  WebSocketData,
  WebSocketExtension,
  WebSocketExtensionMessage,
  WebSocketExtensionApi,
  WebSocketClientHandle,
} from '@mswjs/interceptors/WebSocket'
import {
  WebSocketHandler,
  kEmitter,
  type AnyWebSocketExtension,
  type WebSocketHandlerEventMap,
} from './websocket-handler'
import { hasRefCounted } from '#core/utils/internal/hasRefCounted'
import type { UnionToIntersection } from '#core/typeUtils'
import {
  type Path,
  type PathParams,
  isPath,
} from '#core/utils/matching/matchRequestUrl'
import { attachSiblingHandlers } from '#core/utils/internal/attachSiblingHandlers'
import {
  createWebSocketUpgradeHandler,
  webSocketUpgrade,
} from './websocket-upgrade'
import { WebSocketClientManager } from './websocket-client-manager'

const webSocketChannel = new BroadcastChannel('msw:websocket-client-manager')

if (hasRefCounted(webSocketChannel)) {
  // Allows the Node.js thread to exit if it is the only active handle in the event system.
  // https://nodejs.org/api/worker_threads.html#broadcastchannelunref
  webSocketChannel.unref()
}

export type WebSocketEventListener<
  EventType extends keyof WebSocketHandlerEventMap,
  Extension extends AnyWebSocketExtension = WebSocketExtension,
> = EventMap.Listener<WebSocketHandlerEventMap<Extension>, EventType>

type WebSocketExtensions = ReadonlyArray<AnyWebSocketExtension>

type MergeUnion<Union, Fallback> = [Union] extends [never]
  ? Fallback
  : UnionToIntersection<Union>

/**
 * The extensions of a link merged into a single extension:
 * the connections speak the messages of every extension, and the
 * connection event carries the APIs of every extension. A link
 * without extensions speaks raw WebSocket data.
 */
export type WebSocketLinkExtension<Extensions extends WebSocketExtensions> =
  WebSocketExtension<
    MergeUnion<WebSocketExtensionMessage<Extensions[number]>, WebSocketData>,
    MergeUnion<WebSocketExtensionApi<Extensions[number]>, {}>
  >

export interface WebSocketLinkOptions<
  Extensions extends WebSocketExtensions = [],
> {
  /**
   * Extensions applied to every connection intercepted by this link,
   * left to right. Encoding and decoding happen behind the scenes:
   * `client.send()`, `server.send()`, `broadcast()`, and the `message`
   * events all operate on the extensions' messages, and each extension's
   * own API is exposed on the connection event.
   *
   * @example
   * const chat = ws.link('wss://chat.example.com', { extensions: [new SocketIo()] })
   * chat.addEventListener('connection', ({ client, rooms }) => {
   *   client.send({ event: 'greeting', args: ['hello'] })
   * })
   */
  extensions?: Extensions
}

export type WebSocketLink<
  Extension extends AnyWebSocketExtension = WebSocketExtension,
> = {
  /**
   * A set of all WebSocket clients connected
   * to this link.
   *
   * @see {@link https://mswjs.io/docs/api/ws#clients `clients` API reference}
   */
  clients: Set<WebSocketClientHandle<WebSocketExtensionMessage<Extension>>>

  /**
   * Adds an event listener to this WebSocket link.
   *
   * @example
   * const chat = ws.link('wss://chat.example.com')
   * chat.addEventListener('connection', listener)
   *
   * @see {@link https://mswjs.io/docs/api/ws#onevent-listener `on()` API reference}
   */
  addEventListener: <EventType extends keyof WebSocketHandlerEventMap>(
    event: EventType,
    listener: WebSocketEventListener<EventType, Extension>,
  ) => WebSocketHandler<Extension>

  /**
   * Broadcasts the given data to all WebSocket clients.
   *
   * @example
   * const service = ws.link('wss://example.com')
   * service.addEventListener('connection', () => {
   *   service.broadcast('hello, everyone!')
   * })
   *
   * @see {@link https://mswjs.io/docs/api/ws#broadcastdata `broadcast()` API reference}
   */
  broadcast: (data: WebSocketExtensionMessage<Extension>) => void

  /**
   * Broadcasts the given data to all WebSocket clients
   * except the ones provided in the `clients` argument.
   *
   * @example
   * const service = ws.link('wss://example.com')
   * service.addEventListener('connection', ({ client }) => {
   *   service.broadcastExcept(client, 'hi, the rest of you!')
   * })
   *
   * @see {@link https://mswjs.io/docs/api/ws#broadcastexceptclients-data `broadcast()` API reference}
   */
  broadcastExcept: (
    clients:
      | WebSocketClientHandle<WebSocketExtensionMessage<Extension>>
      | Array<WebSocketClientHandle<WebSocketExtensionMessage<Extension>>>,
    data: WebSocketExtensionMessage<Extension>,
  ) => void
}

/**
 * Intercepts outgoing WebSocket connections to the given URL.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 * chat.addEventListener('connection', ({ client }) => {
 *   client.send('hello from server!')
 * })
 */
function createWebSocketLinkHandler<
  const Extensions extends WebSocketExtensions = [],
>(
  url: Path,
  options?: WebSocketLinkOptions<Extensions>,
): WebSocketLink<WebSocketLinkExtension<Extensions>> {
  invariant(url, 'Expected a WebSocket server URL but got undefined')

  invariant(
    isPath(url),
    'Expected a WebSocket server URL to be a valid path but got %s',
    typeof url,
  )

  const clientManager = new WebSocketClientManager<
    WebSocketExtensionMessage<WebSocketLinkExtension<Extensions>>
  >(webSocketChannel)

  // The same upgrade handler instance is attached as a sibling to every
  // WebSocketHandler returned by this link. `groupHandlersByKind` dedupes
  // by reference, so it lands in the `request` bucket exactly once regardless
  // of which subset of WS handlers the user ends up registering.
  const upgradeHandler = createWebSocketUpgradeHandler(url)

  return {
    get clients() {
      return clientManager.clients
    },
    addEventListener(event, listener) {
      const webSocketHandler = new WebSocketHandler<
        WebSocketLinkExtension<Extensions>
      >(url, {
        extensions: options?.extensions,
      })

      // Add the connection event listener for when the
      // handler matches and emits a connection event.
      // When that happens, store that connection in the
      // set of all connections for reference.
      webSocketHandler[kEmitter].on('connection', async ({ client }) => {
        await clientManager.addConnection(client)
      })

      // The WebSocket network frame invokes the "run()" method
      // on the WebSocketHandler when resolving a connection.
      // If the handler matches, it will emit the "connection"
      // event. Attach the user-defined listener to that event.
      webSocketHandler[kEmitter].on(event, listener)

      return attachSiblingHandlers(webSocketHandler, [upgradeHandler])
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

interface WebSocketNamespace {
  link: typeof createWebSocketLinkHandler
  /**
   * Request handler for the `upgrade` requests to the WebSocket protocol.
   * This requires a WebSocket handler to be present to fire.
   * @note This only affects Node.js as the `upgrade` request header is
   * forbidden and cannot be read in the browser. Consider using the
   * `WebSocket` API for establishing WebSocket connections in the browser.
   */
  onUpgrade: (info: {
    requestId: string
    request: Request
    params: PathParams
  }) => Promise<Response | undefined> | Response | undefined
}

/**
 * A namespace to intercept and mock WebSocket connections.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 *
 * @see {@link https://mswjs.io/docs/api/ws `ws` API reference}
 * @see {@link https://mswjs.io/docs/basics/handling-websocket-events Handling WebSocket events}
 */
export const ws: WebSocketNamespace = {
  link: createWebSocketLinkHandler,
  onUpgrade: webSocketUpgrade,
}

export { type WebSocketData }
