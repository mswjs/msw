import { invariant } from 'outvariant'
import type {
  WebSocketClientConnectionProtocol,
  WebSocketConnectionData,
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
   *
   * @see {@link https://mswjs.io/docs/api/ws#clients `clients` API reference}
   */
  clients: Set<WebSocketClientConnectionProtocol>

  /**
   * Adds an event listener to this WebSocket link.
   *
   * @example
   * const chat = ws.link('wss://chat.example.com')
   * chat.on('connection', listener)
   *
   * @see {@link https://mswjs.io/docs/api/ws#onevent-listener `on()` API reference}
   */
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
   *
   * @see {@link https://mswjs.io/docs/api/ws#broadcastdata `broadcast()` API reference}
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
   *
   * @see {@link https://mswjs.io/docs/api/ws#broadcastexceptclients-data `broadcast()` API reference}
   */
  broadcastExcept(
    clients:
      | WebSocketClientConnectionProtocol
      | Array<WebSocketClientConnectionProtocol>,
    data: WebSocketData,
  ): void
}

export interface WebSocketLinkOptions {
  handleMessage?: (
    type: 'incoming' | 'outgoing',
    data: WebSocketData,
  ) => WebSocketData | Promise<WebSocketData>
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
function createWebSocketLinkHandler(
  url: Path,
  options: WebSocketLinkOptions = {},
): WebSocketLink {
  invariant(url, 'Expected a WebSocket server URL but got undefined')

  invariant(
    isPath(url),
    'Expected a WebSocket server URL to be a valid path but got %s',
    typeof url,
  )

  const clientManager = new WebSocketClientManager({
    url,
    channel: wsBroadcastChannel,
  })

  const withCustomMessageHandler = (
    connection: WebSocketConnectionData,
  ): void => {
    const { handleMessage } = options
    const { client, server } = connection

    if (!handleMessage) {
      return
    }

    // Handle data sent to the client from the interceptor.
    client.send = new Proxy(client.send, {
      apply: (target, thisArg, args) => {
        Promise.resolve(handleMessage('outgoing', args[0])).then((nextData) => {
          Reflect.apply(target, thisArg, [nextData].concat(args.slice(1)))
        })
      },
    })

    // Handle data sent to the original server from the interceptor.
    server.send = new Proxy(server.send, {
      apply: (target, thisArg, args) => {
        Promise.resolve(handleMessage('outgoing', args[0])).then((nextData) => {
          Reflect.apply(target, thisArg, [nextData].concat(args.slice(1)))
        })
      },
    })

    client['transport'].dispatchEvent = new Proxy(
      client['transport'].dispatchEvent,
      {
        apply(target, thisArg, args: [Event]) {
          const [event] = args
          const dispatchEvent = (event: Event) => {
            return Reflect.apply(target, thisArg, [event])
          }

          if (
            event instanceof MessageEvent &&
            (event.type === 'outgoing' || event.type === 'incoming')
          ) {
            /**
             * @note Treat both "incoming" and "outgoing" transport events
             * as "incoming" events in `handleMessage`. These two transport events
             * are different to distinguish between the client sending data
             * ("outgoing") and the original server sending data ("incoming").
             * But for the context of `handleMessage`, both those sends are incoming
             * because both of them MUST be decoded, not encoded.
             */
            Promise.resolve(handleMessage('incoming', event.data)).then(
              (nextData) => {
                // Modify the original message event's `data` before dispatching.
                // Can't do this in the event listener because those are already
                // added internally by Interceptors.
                Object.defineProperty(event, 'data', {
                  value: nextData,
                  enumerable: true,
                })
                dispatchEvent(event)
              },
            )
            return
          }

          return dispatchEvent(event)
        },
      },
    )
  }

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
      handler[kEmitter].on('connection', (connection) => {
        withCustomMessageHandler(connection)
        clientManager.addConnection(connection.client)
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
 * @see {@link https://mswjs.io/docs/basics/handling-websocket-events Handling WebSocket events}
 */
export const ws = {
  link: createWebSocketLinkHandler,
}
