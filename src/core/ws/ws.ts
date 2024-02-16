import { WebSocketClientConnection } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import {
  WebSocketHandler,
  kEmitter,
  type WebSocketHandlerEventMap,
} from '../handlers/WebSocketHandler'
import type { Path } from '../utils/matching/matchRequestUrl'
import { webSocketInterceptor } from './webSocketInterceptor'

const wsBroadcastChannel = new BroadcastChannel('msw:ws')

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

  /**
   * @note The set of all WebSocket clients in THIS runtime.
   * This will be the accumulated list of all clients for Node.js.
   * But in the browser, each tab will create its own runtime,
   * so this set will only contain the matching clients from
   * that isolated runtime (no shared runtime).
   */
  const runtimeClients = new Set<WebSocketClientConnection>()

  return {
    on<K extends keyof WebSocketHandlerEventMap>(
      event: K,
      listener: (...args: WebSocketHandlerEventMap[K]) => void,
    ): WebSocketHandler {
      const handler = new WebSocketHandler(url)

      wsBroadcastChannel.addEventListener('message', (event) => {
        const { type, payload } = event.data

        switch (type) {
          case 'message': {
            const { data, ignoreClients } = payload

            runtimeClients.forEach((client) => {
              if (!ignoreClients || !ignoreClients.includes(client.id)) {
                client.send(data)
              }
            })
            break
          }
        }
      })

      handler[kEmitter].on('connection', ({ client }) => {
        runtimeClients.add(client)
        client.addEventListener('close', () => {
          runtimeClients.delete(client)
        })
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
    broadcast(data: any): void {
      // Broadcast to all the clients of this runtime.
      runtimeClients.forEach((client) => client.send(data))

      // Broadcast to all the clients from other runtimes.
      wsBroadcastChannel.postMessage({
        type: 'message',
        payload: { data },
      })
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
      clients: WebSocketClientConnection | Array<WebSocketClientConnection>,
      data: any,
    ): void {
      const ignoreClients = Array.prototype
        .concat(clients)
        .map((client) => client.id)

      // Broadcast this event to all the clients of this runtime
      // except for the given ignored clients. This is needed
      // so a "broadcastExcept()" call in another runtime affects
      // this runtime but respects the ignored clients.
      runtimeClients.forEach((otherClient) => {
        if (!ignoreClients.includes(otherClient.id)) {
          otherClient.send(data)
        }
      })

      // Broadcast to all the clients from other runtimes,
      // respecting the list of ignored client IDs.
      wsBroadcastChannel.postMessage({
        type: 'message',
        payload: {
          data,
          ignoreClients,
        },
      })
    },
  }
}

export const ws = {
  link: createWebSocketLinkHandler,
}
