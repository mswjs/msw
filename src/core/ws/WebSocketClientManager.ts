import type {
  WebSocketData,
  WebSocketClientConnection,
  WebSocketClientConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'

type WebSocketBroadcastChannelMessage =
  | {
      type: 'connection:open'
      payload: {
        id: string
        url: URL
      }
    }
  | {
      type: 'send'
      payload: {
        clientId: string
        data: WebSocketData
      }
    }
  | {
      type: 'close'
      payload: {
        clientId: string
        code?: number
        reason?: string
      }
    }

export const kAddByClientId = Symbol('kAddByClientId')

/**
 * A manager responsible for accumulating WebSocket client
 * connections across different browser runtimes.
 */
export class WebSocketClientManager {
  /**
   * All active WebSocket client connections.
   */
  public clients: Set<WebSocketClientConnectionProtocol>

  constructor(private channel: BroadcastChannel) {
    this.clients = new Set()

    this.channel.addEventListener('message', (message) => {
      const { type, payload } = message.data as WebSocketBroadcastChannelMessage

      switch (type) {
        case 'connection:open': {
          // When another runtime notifies about a new connection,
          // create a connection wrapper class and add it to the set.
          this.onRemoteConnection(payload.id, payload.url)
          break
        }
      }
    })
  }

  /**
   * Adds the given WebSocket client connection to the set
   * of all connections. The given connection is always the complete
   * connection object because `addConnection()` is called only
   * for the opened connections in the same runtime.
   */
  public addConnection(client: WebSocketClientConnection): void {
    // Add this connection to the immediate set of connections.
    this.clients.add(client)

    // Signal to other runtimes about this connection.
    this.channel.postMessage({
      type: 'connection:open',
      payload: {
        id: client.id,
        url: client.url,
      },
    } as WebSocketBroadcastChannelMessage)

    // Instruct the current client how to handle events
    // coming from other runtimes (e.g. when broadcasting).
    this.channel.addEventListener('message', (message) => {
      const { type, payload } = message.data as WebSocketBroadcastChannelMessage

      // Ignore broadcasted messages for other clients.
      if (
        typeof payload === 'object' &&
        'clientId' in payload &&
        payload.clientId !== client.id
      ) {
        return
      }

      switch (type) {
        case 'send': {
          client.send(payload.data)
          break
        }

        case 'close': {
          client.close(payload.code, payload.reason)
          break
        }
      }
    })
  }

  /**
   * Adds a client connection wrapper to operate with
   * WebSocket client connections in other runtimes.
   */
  private onRemoteConnection(id: string, url: URL): void {
    this.clients.add(
      // Create a connection-compatible instance that can
      // operate with this client from a different runtime
      // using the BroadcastChannel messages.
      new WebSocketRemoteClientConnection(id, url, this.channel),
    )
  }
}

/**
 * A wrapper class to operate with WebSocket client connections
 * from other runtimes. This class maintains 1-1 public API
 * compatibility to the `WebSocketClientConnection` but relies
 * on the given `BroadcastChannel` to communicate instructions
 * with the client connections from other runtimes.
 */
class WebSocketRemoteClientConnection
  implements WebSocketClientConnectionProtocol
{
  constructor(
    public readonly id: string,
    public readonly url: URL,
    private channel: BroadcastChannel,
  ) {}

  send(data: WebSocketData): void {
    this.channel.postMessage({
      type: 'send',
      payload: {
        clientId: this.id,
        data,
      },
    } as WebSocketBroadcastChannelMessage)
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    this.channel.postMessage({
      type: 'close',
      payload: {
        clientId: this.id,
        code,
        reason,
      },
    } as WebSocketBroadcastChannelMessage)
  }
}
