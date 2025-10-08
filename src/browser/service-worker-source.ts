import { invariant } from 'outvariant'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { supportsServiceWorker } from './utils/supports'
import { NetworkFrame, NetworkSource } from '~/core/new/sources'
import { WorkerChannel, WorkerChannelEventMap } from './utils/workerChannel'
import { getWorkerInstance } from './setupWorker/start/utils/getWorkerInstance'
import { Emitter } from 'rettime'

interface ServiceWorkerSourceOptions {
  serviceWorker: {
    url: string
  }
}

export class ServiceWorkerSource extends NetworkSource {
  #channel: WorkerChannel
  #workerPromise: DeferredPromise<ServiceWorker>

  constructor(private readonly options: ServiceWorkerSourceOptions) {
    super()

    invariant(
      supportsServiceWorker(),
      'Cannot use Service Worker network source: the Service Worker API is not supported',
    )

    this.#workerPromise = new DeferredPromise()
    this.#channel = new WorkerChannel({
      worker: this.#workerPromise,
    })
  }

  public async enable() {
    if (this.#workerPromise.state !== 'pending') {
      this.#workerPromise = new DeferredPromise()
    }

    // Register the Service Worker and gets its reference.
    const [worker, registartion] = await getWorkerInstance(
      this.options.serviceWorker.url,
      this.options.serviceWorker.options,
      this.options.findWorker,
    )

    if (!worker) {
      /** @fixme Finish this. */
      return
    }

    this.#workerPromise.resolve(worker)

    this.#channel.on('REQUEST', (event) => {
      const frame = new ServiceWorkerNetworkFrame(event)

      /**
       * @todo Probably construct an entire HttpFrame event here
       * so that Service Worker source implements `frame.respondWith()`
       * as a message sent via the `this.#channel`, while Node.js source
       * implements it by tapping into the interceptor, etc.
       */
      this.push(frame)
    })
  }

  public async disable() {
    await super.disable()
    this.#channel.removeAllListeners()
  }
}

class ServiceWorkerNetworkFrame extends NetworkFrame {
  constructor(
    private readonly event: Emitter.EventType<
      WorkerChannel,
      'REQUEST',
      WorkerChannelEventMap
    >,
  ) {
    super()
  }

  public respondWith(response: Response | undefined): void {
    this.event.postMessage('MOCK_RESPONSE', response)
  }

  public passthrough(): void {
    this.event.postMessage('PASSTHROUGH')
  }
}
