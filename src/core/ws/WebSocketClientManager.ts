import { DeferredPromise } from '@open-draft/deferred-promise'
import type {
  WebSocketData,
  WebSocketClientConnection,
  WebSocketClientConnectionProtocol,
} from '@mswjs/interceptors/WebSocket'
import { type Path } from '../utils/matching/matchRequestUrl'

const DB_NAME = 'msw-websocket-clients'
const DB_STORE_NAME = 'clients'

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
  id: string
  url: string
}

/**
 * A manager responsible for accumulating WebSocket client
 * connections across different browser runtimes.
 */
export class WebSocketClientManager {
  private db: Promise<IDBDatabase>
  private runtimeClients: Map<string, WebSocketClientConnectionProtocol>
  private allClients: Set<WebSocketClientConnectionProtocol>

  constructor(
    private channel: BroadcastChannel,
    private url: Path,
  ) {
    this.db = this.createDatabase()
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

  private async createDatabase() {
    const promise = new DeferredPromise<IDBDatabase>()
    const request = indexedDB.open(DB_NAME, 1)

    request.onsuccess = ({ currentTarget }) => {
      const db = Reflect.get(currentTarget!, 'result') as IDBDatabase

      if (db.objectStoreNames.contains(DB_STORE_NAME)) {
        return promise.resolve(db)
      }
    }

    request.onupgradeneeded = async ({ currentTarget }) => {
      const db = Reflect.get(currentTarget!, 'result') as IDBDatabase
      if (db.objectStoreNames.contains(DB_STORE_NAME)) {
        return
      }

      const store = db.createObjectStore(DB_STORE_NAME, { keyPath: 'id' })
      store.transaction.oncomplete = () => {
        promise.resolve(db)
      }
      store.transaction.onerror = () => {
        promise.reject(new Error('Failed to create WebSocket client store'))
      }
    }
    request.onerror = () => {
      promise.reject(new Error('Failed to open an IndexedDB database'))
    }

    return promise
  }

  private flushDatabaseToMemory() {
    this.getStore().then((store) => {
      const request = store.getAll() as IDBRequest<Array<SerializedClient>>

      request.onsuccess = () => {
        this.allClients = new Set(
          request.result.map((client) => {
            const runtimeClient = this.runtimeClients.get(client.id)

            /**
             * @note For clients originating in this runtime, use their
             * direct references. No need to wrap them in a remote connection.
             */
            if (runtimeClient) {
              return runtimeClient
            }

            return new WebSocketRemoteClientConnection(
              client.id,
              new URL(client.url),
              this.channel,
            )
          }),
        )
      }
    })
  }

  private async getStore(): Promise<IDBObjectStore> {
    const db = await this.db
    return db.transaction(DB_STORE_NAME, 'readwrite').objectStore(DB_STORE_NAME)
  }

  private async removeRuntimeClients(): Promise<void> {
    const promise = new DeferredPromise<void>()
    const store = await this.getStore()

    this.runtimeClients.forEach((client) => {
      store.delete(client.id)
    })

    store.transaction.oncomplete = () => {
      this.runtimeClients.clear()
      this.flushDatabaseToMemory()
      this.notifyOthersAboutDatabaseUpdate()
      promise.resolve()
    }

    store.transaction.onerror = () => {
      promise.reject(
        new Error('Failed to remove runtime clients from the store'),
      )
    }

    return promise
  }

  /**
   * All active WebSocket client connections.
   */
  get clients(): Set<WebSocketClientConnectionProtocol> {
    return this.allClients
  }

  private notifyOthersAboutDatabaseUpdate(): void {
    // Notify other runtimes to sync their in-memory clients
    // with the updated database.
    this.channel.postMessage({ type: 'db:update' })
  }

  private addClient(client: WebSocketClientConnection): void {
    this.getStore()
      .then((store) => {
        const request = store.add({
          id: client.id,
          url: client.url.href,
        } satisfies SerializedClient)

        request.onsuccess = () => {
          // Sync the in-memory clients in this runtime with the
          // updated database. This pulls in all the stored clients.
          this.flushDatabaseToMemory()
          this.notifyOthersAboutDatabaseUpdate()
        }

        request.onerror = () => {
          // eslint-disable-next-line no-console
          console.error(
            `Failed to add a WebSocket client ("${client.id}") connection to the store.`,
          )
        }
      })
      .catch((error) => {
        // eslint-disable-next-line no-console
        console.error(
          `Failed to add a WebSocket client ("${client.id}") to the store: ${error}`,
        )
      })
  }

  /**
   * Adds the given `WebSocket` client connection to the set
   * of all connections. The given connection is always the complete
   * connection object because `addConnection()` is called only
   * for the opened connections in the same runtime.
   */
  public addConnection(client: WebSocketClientConnection): void {
    this.runtimeClients.set(client.id, client)
    this.addClient(client)

    // Handle the incoming BroadcastChannel messages from other runtimes
    // that attempt to control this runtime (via a remote connection wrapper).
    // E.g. another runtime calling `client.send()` for the client in this runtime.
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
