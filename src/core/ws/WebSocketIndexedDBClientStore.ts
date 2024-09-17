import { DeferredPromise } from '@open-draft/deferred-promise'
import { WebSocketClientConnectionProtocol } from '@mswjs/interceptors/lib/browser/interceptors/WebSocket'
import {
  type SerializedWebSocketClient,
  WebSocketClientStore,
} from './WebSocketClientStore'

const DB_NAME = 'msw-websocket-clients'
const DB_STORE_NAME = 'clients'

export class WebSocketIndexedDBClientStore implements WebSocketClientStore {
  private db: Promise<IDBDatabase>

  constructor() {
    this.db = this.createDatabase()
  }

  public async add(client: WebSocketClientConnectionProtocol): Promise<void> {
    const promise = new DeferredPromise<void>()
    const store = await this.getStore()
    const request = store.add({
      id: client.id,
      url: client.url.href,
    } satisfies SerializedWebSocketClient)

    request.onsuccess = () => {
      promise.resolve()
    }
    request.onerror = () => {
      promise.reject(new Error(`Failed to add WebSocket client ${client.id}`))
    }

    return promise
  }

  public async getAll(): Promise<Array<SerializedWebSocketClient>> {
    const promise = new DeferredPromise<Array<SerializedWebSocketClient>>()
    const store = await this.getStore()
    const request = store.getAll() as IDBRequest<
      Array<SerializedWebSocketClient>
    >

    request.onsuccess = () => {
      promise.resolve(request.result)
    }
    request.onerror = () => {
      promise.reject(new Error(`Failed to get all WebSocket clients`))
    }

    return promise
  }

  public async deleteMany(clientIds: Array<string>): Promise<void> {
    const promise = new DeferredPromise<void>()
    const store = await this.getStore()

    for (const clientId of clientIds) {
      store.delete(clientId)
    }

    store.transaction.oncomplete = () => {
      promise.resolve()
    }
    store.transaction.onerror = () => {
      promise.reject(
        new Error(
          `Failed to delete WebSocket clients [${clientIds.join(', ')}]`,
        ),
      )
    }

    return promise
  }

  private async createDatabase(): Promise<IDBDatabase> {
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

  private async getStore(): Promise<IDBObjectStore> {
    const db = await this.db
    return db.transaction(DB_STORE_NAME, 'readwrite').objectStore(DB_STORE_NAME)
  }
}
