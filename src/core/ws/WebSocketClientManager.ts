import { invariant } from 'outvariant'
import type {
  WebSocketData,
  WebSocketClientConnection,
  WebSocketClientConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'
import { matchRequestUrl, type Path } from '../utils/matching/matchRequestUrl'

export const MSW_WEBSOCKET_CLIENTS_KEY = 'msw:ws:clients'

export type WebSocketBroadcastChannelMessage =
  | {
      type: 'extraneous:send'
      payload: {
        clientId: string
        data: WebSocketData
      }
    }
  | {
      type: 'extraneous:close'
      payload: {
        clientId: string
        code?: number
        reason?: string
      }
    }

type SerializedClient = {
  clientId: string
  url: string
}

/**
 * A manager responsible for accumulating WebSocket client
 * connections across different browser runtimes.
 */
export class WebSocketClientManager {
  private inMemoryClients: Set<WebSocketClientConnectionProtocol>

  constructor(
    private channel: BroadcastChannel,
    private url: Path,
  ) {
    this.inMemoryClients = new Set()

    if (typeof localStorage !== 'undefined') {
      // When the worker clears the local storage key in "worker.stop()",
      // also clear the in-memory clients map.
      localStorage.removeItem = new Proxy(localStorage.removeItem, {
        apply: (target, thisArg, args) => {
          const [key] = args

          if (key === MSW_WEBSOCKET_CLIENTS_KEY) {
            this.inMemoryClients.clear()
          }

          return Reflect.apply(target, thisArg, args)
        },
      })
    }
  }

  /**
   * All active WebSocket client connections.
   */
  get clients(): Set<WebSocketClientConnectionProtocol> {
    // In the browser, different runtimes use "localStorage"
    // as the shared source of all the clients.
    if (typeof localStorage !== 'undefined') {
      const inMemoryClients = Array.from(this.inMemoryClients)

      console.log('get clients()', inMemoryClients, this.getSerializedClients())

      return new Set(
        inMemoryClients.concat(
          this.getSerializedClients()
            // Filter out the serialized clients that are already present
            // in this runtime in-memory. This is crucial because a remote client
            // wrapper CANNOT send a message to the client in THIS runtime
            // (the "message" event on broadcast channel won't trigger).
            .filter((serializedClient) => {
              if (
                inMemoryClients.every(
                  (client) => client.id !== serializedClient.clientId,
                )
              ) {
                return serializedClient
              }
            })
            .map((serializedClient) => {
              return new WebSocketRemoteClientConnection(
                serializedClient.clientId,
                new URL(serializedClient.url),
                this.channel,
              )
            }),
        ),
      )
    }

    // In Node.js, the manager acts as a singleton, and all clients
    // are kept in-memory.
    return this.inMemoryClients
  }

  private getSerializedClients(): Array<SerializedClient> {
    invariant(
      typeof localStorage !== 'undefined',
      'Failed to call WebSocketClientManager#getSerializedClients() in a non-browser environment. This is likely a bug in MSW. Please, report it on GitHub: https://github.com/mswjs/msw',
    )

    const clientsJson = localStorage.getItem(MSW_WEBSOCKET_CLIENTS_KEY)

    if (!clientsJson) {
      return []
    }

    const allClients = JSON.parse(clientsJson) as Array<SerializedClient>
    const matchingClients = allClients.filter((client) => {
      return matchRequestUrl(new URL(client.url), this.url).matches
    })

    return matchingClients
  }

  private addClient(client: WebSocketClientConnection): void {
    this.inMemoryClients.add(client)

    if (typeof localStorage !== 'undefined') {
      const serializedClients = this.getSerializedClients()

      // Serialize the current client for other runtimes to create
      // a remote wrapper over it. This has no effect on the current runtime.
      const nextSerializedClients = serializedClients.concat({
        clientId: client.id,
        url: client.url.href,
      } as SerializedClient)

      localStorage.setItem(
        MSW_WEBSOCKET_CLIENTS_KEY,
        JSON.stringify(nextSerializedClients),
      )
    }
  }

  /**
   * Adds the given `WebSocket` client connection to the set
   * of all connections. The given connection is always the complete
   * connection object because `addConnection()` is called only
   * for the opened connections in the same runtime.
   */
  public addConnection(client: WebSocketClientConnection): void {
    this.addClient(client)

    // Instruct the current client how to handle events
    // coming from other runtimes (e.g. when calling `.broadcast()`).
    const handleExtraneousMessage = (
      message: MessageEvent<WebSocketBroadcastChannelMessage>,
    ) => {
      const { type, payload } = message.data

      // Ignore broadcasted messages for other clients.
      if (
        typeof payload === 'object' &&
        'clientId' in payload &&
        payload.clientId !== client.id
      ) {
        return
      }

      switch (type) {
        case 'extraneous:send': {
          client.send(payload.data)
          break
        }

        case 'extraneous:close': {
          client.close(payload.code, payload.reason)
          break
        }
      }
    }

    const abortController = new AbortController()

    this.channel.addEventListener('message', handleExtraneousMessage, {
      signal: abortController.signal,
    })

    // Once closed, this connection cannot be operated on.
    // This must include the extraneous runtimes as well.
    client.addEventListener('close', () => abortController.abort(), {
      once: true,
    })
  }
}

/**
 * A wrapper class to operate with WebSocket client connections
 * from other runtimes. This class maintains 1-1 public API
 * compatibility to the `WebSocketClientConnection` but relies
 * on the given `BroadcastChannel` to communicate instructions
 * with the client connections from other runtimes.
 */
export class WebSocketRemoteClientConnection
  implements WebSocketClientConnectionProtocol
{
  constructor(
    public readonly id: string,
    public readonly url: URL,
    private channel: BroadcastChannel,
  ) {}

  send(data: WebSocketData): void {
    this.channel.postMessage({
      type: 'extraneous:send',
      payload: {
        clientId: this.id,
        data,
      },
    } as WebSocketBroadcastChannelMessage)
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    this.channel.postMessage({
      type: 'extraneous:close',
      payload: {
        clientId: this.id,
        code,
        reason,
      },
    } as WebSocketBroadcastChannelMessage)
  }
}
