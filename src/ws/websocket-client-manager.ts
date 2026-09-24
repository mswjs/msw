import type {
  WebSocketData,
  WebSocketClientHandle,
  WebSocketClientEventMap,
} from '@mswjs/interceptors/WebSocket'
import type { WebSocketClientStore } from './websocket-client-store'
import { WebSocketMemoryClientStore } from './websocket-memory-client-store'
import { WebSocketIndexedDBClientStore } from './websocket-indexeddb-client-store'

export type WebSocketBroadcastChannelMessage<Message = WebSocketData> =
  | {
      type: 'extraneous:send'
      payload: {
        clientId: string
        data: Message
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

/**
 * A manager responsible for accumulating WebSocket client
 * connections across different browser runtimes.
 */
export class WebSocketClientManager<Message = WebSocketData> {
  private store: WebSocketClientStore
  private runtimeClients: Map<string, WebSocketClientHandle<Message>>
  private allClients: Set<WebSocketClientHandle<Message>>

  constructor(private channel: BroadcastChannel) {
    // Store the clients in the IndexedDB in the browser,
    // otherwise, store the clients in memory.
    this.store =
      typeof indexedDB !== 'undefined'
        ? new WebSocketIndexedDBClientStore()
        : new WebSocketMemoryClientStore()

    this.runtimeClients = new Map()
    this.allClients = new Set()

    this.channel.addEventListener('message', (message) => {
      if (message.data?.type === 'db:update') {
        this.flushDatabaseToMemory()
      }
    })

    if (typeof window !== 'undefined') {
      window.addEventListener('message', async (message) => {
        if (message.data?.type === 'msw/worker:stop') {
          await this.removeRuntimeClients()
        }
      })
    }
  }

  private async flushDatabaseToMemory() {
    const storedClients = await this.store.getAll()

    this.allClients = new Set(
      storedClients.map((client) => {
        const runtimeClient = this.runtimeClients.get(client.id)

        /**
         * @note For clients originating in this runtime, use their
         * direct references. No need to wrap them in a remote connection.
         */
        if (runtimeClient) {
          return runtimeClient
        }

        return new WebSocketRemoteClientConnection<Message>(
          client.id,
          new URL(client.url),
          this.channel,
        )
      }),
    )
  }

  private async removeRuntimeClients(): Promise<void> {
    await this.store.deleteMany(Array.from(this.runtimeClients.keys()))
    this.runtimeClients.clear()
    await this.flushDatabaseToMemory()
    this.notifyOthersAboutDatabaseUpdate()
  }

  /**
   * All active WebSocket client connections.
   */
  get clients(): Set<WebSocketClientHandle<Message>> {
    return this.allClients
  }

  /**
   * Notify other runtimes about the database update
   * using the shared `BroadcastChannel` instance.
   */
  private notifyOthersAboutDatabaseUpdate(): void {
    this.channel.postMessage({ type: 'db:update' })
  }

  private async addClient(client: WebSocketClientHandle): Promise<void> {
    await this.store.add(client)
    // Sync the in-memory clients in this runtime with the
    // updated database. This pulls in all the stored clients.
    await this.flushDatabaseToMemory()
    this.notifyOthersAboutDatabaseUpdate()
  }

  /**
   * Adds the given `WebSocket` client connection to the set
   * of all connections. The given connection is always the complete
   * connection object because `addConnection()` is called only
   * for the opened connections in the same runtime.
   */
  public async addConnection(client: WebSocketClientHandle): Promise<void> {
    // Store this client in the map of clients created in this runtime.
    // This way, the manager can distinguish between this runtime clients
    // and extraneous runtime clients when synchronizing clients storage.
    this.runtimeClients.set(client.id, client)

    // Add the new client to the storage.
    await this.addClient(client)

    // Handle the incoming BroadcastChannel messages from other runtimes
    // that attempt to control this runtime (via a remote connection wrapper).
    // E.g. another runtime calling `client.send()` for the client in this runtime.
    const handleExtraneousMessage = (
      message: MessageEvent<WebSocketBroadcastChannelMessage<Message>>,
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
class WebSocketRemoteClientConnection<
  Message = WebSocketData,
> implements WebSocketClientHandle<Message> {
  constructor(
    public readonly id: string,
    public readonly url: URL,
    private channel: BroadcastChannel,
  ) {}

  send(data: Message): void {
    this.channel.postMessage({
      type: 'extraneous:send',
      payload: {
        clientId: this.id,
        data,
      },
    } as WebSocketBroadcastChannelMessage<Message>)
  }

  close(code?: number | undefined, reason?: string | undefined): void {
    this.channel.postMessage({
      type: 'extraneous:close',
      payload: {
        clientId: this.id,
        code,
        reason,
      },
    } as WebSocketBroadcastChannelMessage<Message>)
  }

  addEventListener<EventType extends keyof WebSocketClientEventMap<Message>>(
    _type: EventType,
    _listener: (
      this: WebSocket,
      event: WebSocketClientEventMap<Message>[EventType],
    ) => void,
    _options?: AddEventListenerOptions | boolean,
  ): void {
    throw new Error(
      'WebSocketRemoteClientConnection.addEventListener is not supported',
    )
  }

  removeEventListener<EventType extends keyof WebSocketClientEventMap<Message>>(
    _event: EventType,
    _listener: (
      this: WebSocket,
      event: WebSocketClientEventMap<Message>[EventType],
    ) => void,
    _options?: EventListenerOptions | boolean,
  ): void {
    throw new Error(
      'WebSocketRemoteClientConnection.removeEventListener is not supported',
    )
  }
}
