import { createRequestId } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'

export type TransactionCallback<T> = (
  store: Record<string, T>,
) => void | Promise<void>

const kTransactionId = Symbol('kTransactionId')

/**
 * @todo @fixme Unref the broadcast channel because it prevents
 * Node.js process from exiting normally.
 */

export class AsyncCollection<T> {
  private store: Record<string, T>
  private channel: BroadcastChannel
  private queue: Set<DeferredPromise<void>>

  constructor(name: string) {
    this.channel = new BroadcastChannel(name)
    this.store = {}
    this.queue = new Set()
    this.subscribeToQueue()
    this.hydrate()
  }

  public forEach(
    callback: (value: T, key: string, done: () => void) => void,
  ): void {
    const controller = new AbortController()

    for (const key in this.store) {
      if (controller.signal.aborted) {
        break
      }
      callback(this.store[key], key, controller.abort.bind(controller))
    }
  }

  public async clear(): Promise<void> {
    await this.transaction(() => {
      this.store = {}
    })
  }

  public async all(): Promise<Array<T>> {
    return Object.values(this.store)
  }

  public async get(key: string): Promise<T | undefined> {
    await this.exhaustQueue()
    return this.store[key]
  }

  public async put(key: string, value: T): Promise<void> {
    await this.transaction((store) => {
      store[key] = value
    })
  }

  public async delete(key: string): Promise<void> {
    await this.transaction((store) => {
      delete store[key]
    })
  }

  public async deleteMany(keys: Array<string>): Promise<void> {
    await this.transaction((store) => {
      for (const key of keys) {
        delete store[key]
      }
    })
  }

  public async transaction(callback: TransactionCallback<T>): Promise<void> {
    const transactionId = createRequestId()

    // Wait for any pending extraneous transactions.
    await this.exhaustQueue()

    // Lock other collections until this transaction is done.
    this.lock(transactionId)

    // Execute the transaction.
    await callback(this.store)

    // Persist the next store.
    this.persist()

    // Notify other collections to pull the store.
    this.release(transactionId)
  }

  private async exhaustQueue(): Promise<void> {
    await Promise.allSettled(this.queue)
  }

  private lock(transactionId: string) {
    this.channel.postMessage({
      type: 'collection:lock',
      transactionId,
    })
  }

  private release(transactionId: string) {
    this.channel.postMessage({
      type: 'collection:release',
      transactionId,
    })
  }

  private subscribeToQueue(): void {
    this.channel.addEventListener('message', (event) => {
      switch (event.data?.type) {
        case 'collection:lock': {
          const lockPromise = new DeferredPromise<void>()
          Reflect.set(lockPromise, kTransactionId, event.data.transactionId)
          lockPromise.then(() => this.hydrate())
          this.queue.add(lockPromise)
          break
        }

        case 'collection:release': {
          for (const promise of this.queue) {
            if (
              Reflect.get(promise, kTransactionId) === event.data.transactionId
            ) {
              promise.resolve()
              this.queue.delete(promise)
              break
            }
          }
          break
        }
      }
    })
  }

  private getPersistKey(): string {
    return `msw:collection:${this.channel.name}`
  }

  private persist(): void {
    localStorage.setItem(this.getPersistKey(), JSON.stringify(this.store))
  }

  private hydrate(): void {
    const persistedStore = localStorage.getItem(this.getPersistKey())
    this.store = persistedStore ? JSON.parse(persistedStore) : {}
  }
}
