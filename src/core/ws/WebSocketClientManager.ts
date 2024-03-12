import type {
  WebSocketData,
  WebSocketClientConnection,
  WebSocketClientConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'

export type WebSocketBroadcastChannelMessage =
  | {
      type: 'connection:open'
      payload: {
        clientId: string
        url: string
      }
    }
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
          this.onRemoteConnection(payload.clientId, new URL(payload.url))
          break
        }
      }
    })
  }

  /**
   * Adds the given `WebSocket` client connection to the set
   * of all connections. The given connection is always the complete
   * connection object because `addConnection()` is called only
   * for the opened connections in the same runtime.
   */
  public addConnection(client: WebSocketClientConnection): void {
    this.clients.add(client)

    // Signal to other runtimes about this connection.
    this.channel.postMessage({
      type: 'connection:open',
      payload: {
        clientId: client.id,
        url: client.url.toString(),
      },
    } as WebSocketBroadcastChannelMessage)

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
