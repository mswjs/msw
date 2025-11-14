import { invariant } from 'outvariant'
import { Emitter } from 'rettime'
import { FetchResponse } from '@mswjs/interceptors'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpResponse, RequestHandler } from '~/core'
import { NetworkSource } from '~/core/new/sources/index'
import {
  supportsReadableStreamTransfer,
  supportsServiceWorker,
} from '../utils/supports'
import { WorkerChannel, WorkerChannelEventMap } from '../utils/workerChannel'
import { getWorkerInstance } from '../setupWorker/start/utils/getWorkerInstance'
import { deserializeRequest } from '../utils/deserializeRequest'
import { toResponseInit } from '~/core/utils/toResponseInit'
import { devUtils } from '~/core/utils/internal/devUtils'
import { HttpNetworkFrame } from '~/core/new/frames/http-frame'
import type { FindWorker } from '../setup-worker'

interface ServiceWorkerSourceOptions {
  quiet?: boolean
  serviceWorker: {
    url: string
    options?: RegistrationOptions
  }
  findWorker?: FindWorker
}

type RequestEvent = Emitter.EventType<
  WorkerChannel,
  'REQUEST',
  WorkerChannelEventMap
>

type ResponseEvent = Emitter.EventType<
  WorkerChannel,
  'RESPONSE',
  WorkerChannelEventMap
>

export class ServiceWorkerSource extends NetworkSource {
  #framesMap: Map<string, ServiceWorkerHttpNetworkFrame>
  #stoppedAt?: number
  #channel: WorkerChannel
  #workerPromise: DeferredPromise<ServiceWorker>
  #keepAliveInterval?: number

  constructor(private readonly options: ServiceWorkerSourceOptions) {
    super()

    invariant(
      supportsServiceWorker(),
      'Cannot use Service Worker network source: the Service Worker API is not supported',
    )

    this.#framesMap = new Map()
    this.#workerPromise = new DeferredPromise()
    this.#channel = new WorkerChannel({
      worker: this.#workerPromise,
    })
  }

  public async enable(): Promise<ServiceWorkerRegistration> {
    this.#stoppedAt = undefined

    if (this.#workerPromise.state !== 'pending') {
      this.#workerPromise = new DeferredPromise()
    }

    // Register the worker or get the active instance.
    const registration = await this.#startWorker()
    const pendingInstance = registration.installing || registration.waiting

    // Wait until the worker is activated and controlling the page.
    if (pendingInstance) {
      const activationPromise = new DeferredPromise<void>()
      pendingInstance.addEventListener('statechange', () => {
        if (pendingInstance.state === 'activated') {
          activationPromise.resolve()
        }
      })
      await activationPromise
    }

    this.#channel.postMessage('MOCK_ACTIVATE')

    // Wait for the worker to confirm its activation.
    const activationPromise = new DeferredPromise<void>()
    this.#channel.once('MOCKING_ENABLED', async (event) => {
      activationPromise.resolve()

      this.#printStartMessage({
        registration,
        client: event.data.client,
      })
    })
    await activationPromise

    return registration
  }

  public async disable() {
    await super.disable()

    this.#framesMap.clear()
    this.#stoppedAt = Date.now()
    this.#channel.removeAllListeners()
  }

  async #startWorker(): Promise<ServiceWorkerRegistration> {
    const serviceWorkerUrl = this.options.serviceWorker.url

    // Register the Service Worker and gets its reference.
    const [worker, registartion] = await getWorkerInstance(
      serviceWorkerUrl,
      this.options.serviceWorker.options,
      this.options.findWorker || this.#defaultFindWorker,
    )

    if (!worker) {
      const missingWorkerMessage = this.options?.findWorker
        ? devUtils.formatMessage(
            `Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "%s".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
`,
            serviceWorkerUrl,
          )
        : devUtils.formatMessage(
            `Failed to locate the Service Worker registration.

This most likely means that the worker script URL "%s" cannot resolve against the actual public hostname (%s). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`,
            serviceWorkerUrl,
            location.host,
          )

      throw new Error(missingWorkerMessage)
    }

    this.#workerPromise.resolve(worker)
    this.#channel.on('REQUEST', this.#onRequest.bind(this))
    this.#channel.on('RESPONSE', this.#onResponse.bind(this))

    window.addEventListener('beforeunload', () => {
      if (worker.state !== 'redundant') {
        // Notify the Service Worker that this client has closed.
        // Internally, it's similar to disabling the mocking, only
        // client close event has a handler that self-terminates
        // the Service Worker when there are no open clients.
        this.#channel.postMessage('CLIENT_CLOSED')
      }

      // Make sure we're always clearing the interval - there are reports that not doing this can
      // cause memory leaks in headless browser environments.
      window.clearInterval(this.#keepAliveInterval)

      // Notify others about this client disconnecting.
      // E.g. this will purge the in-memory WebSocket clients since
      // starting the worker again will assign them new IDs.
      window.postMessage({ type: 'msw/worker:stop' })
    })

    // Ensure the registered worker and the library worker match.
    await this.#checkWorkerIntegrity().catch((error) => {
      devUtils.error(
        'Error while checking the worker script integrity. Please report this on GitHub (https://github.com/mswjs/msw/issues) and include the original error below.',
      )
      console.error(error)
    })

    this.#keepAliveInterval = window.setInterval(
      () => this.#channel.postMessage('KEEPALIVE_REQUEST'),
      5000,
    )

    return registartion
  }

  async #onRequest(event: RequestEvent): Promise<void> {
    // Passthrough any requests performed after the interception was stopped.
    if (this.#stoppedAt && event.data.interceptedAt > this.#stoppedAt) {
      return event.postMessage('PASSTHROUGH')
    }

    const request = deserializeRequest(event.data)

    // Clone the request and cache it so the first matching handler
    // will skip the cloning phase altogether.
    RequestHandler.cache.set(request, request.clone())

    // Create an HTTP frame that taps into the underlying `MessageChannel`
    // for scenario handling. Service Worker source only deals with HTTP requests.
    const frame = new ServiceWorkerHttpNetworkFrame({
      event,
      request,
    })
    this.#framesMap.set(event.data.id, frame)

    await this.push(frame)
  }

  async #onResponse(event: ResponseEvent) {
    const { request, response, isMockedResponse } = event.data
    const frame = this.#framesMap.get(request.id)
    this.#framesMap.delete(request.id)

    invariant(
      frame != null,
      'Failed to handle a worker response for request "%s %s": request frame is missing',
      request.method,
      request.url,
    )

    const fetchRequest = deserializeRequest(request)

    /**
     * CORS requests with `mode: "no-cors"` result in "opaque" responses.
     * That kind of responses cannot be manipulated in JavaScript due
     * to the security considerations.
     * @see https://fetch.spec.whatwg.org/#concept-filtered-response-opaque
     * @see https://github.com/mswjs/msw/issues/529
     */
    if (response.type?.includes('opaque')) {
      return
    }

    const fetchResponse =
      response.status === 0
        ? Response.error()
        : new FetchResponse(response.body, response)

    frame.events.emit(
      isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        request: fetchRequest,
        requestId: request.id,
        response: fetchResponse,
      },
    )
  }

  #defaultFindWorker: FindWorker = (scriptUrl, mockServiceWorkerUrl) => {
    return scriptUrl === mockServiceWorkerUrl
  }

  async #checkWorkerIntegrity(): Promise<void> {
    const integrityCheckPromise = new DeferredPromise<void>()

    this.#channel.postMessage('INTEGRITY_CHECK_REQUEST')
    this.#channel.once('INTEGRITY_CHECK_RESPONSE', (event) => {
      const { checksum, packageVersion } = event.data

      // Compare the response from the Service Worker and the
      // global variable set during the build.

      // The integrity is validated based on the worker script's checksum
      // that's derived from its minified content during the build.
      // The "SERVICE_WORKER_CHECKSUM" global variable is injected by the build.
      if (checksum !== SERVICE_WORKER_CHECKSUM) {
        devUtils.warn(
          `The currently registered Service Worker has been generated by a different version of MSW (${packageVersion}) and may not be fully compatible with the installed version.

It's recommended you update your worker script by running this command:

  \u2022 npx msw init <PUBLIC_DIR>

You can also automate this process and make the worker script update automatically upon the library installations. Read more: https://mswjs.io/docs/cli/init.`,
        )
      }

      integrityCheckPromise.resolve()
    })

    return integrityCheckPromise
  }

  #printStartMessage(args: {
    registration: ServiceWorkerRegistration
    client: WorkerChannelEventMap['MOCKING_ENABLED']['data']['client']
  }): void {
    if (this.options.quiet) {
      return
    }

    const { registration, client } = args
    const serviceWorkerUrl = this.options.serviceWorker.url

    console.groupCollapsed(
      `%c${devUtils.formatMessage('Mocking enabled.')}`,
      'color:orangered;font-weight:bold;',
    )
    // eslint-disable-next-line no-console
    console.log(
      '%cDocumentation: %chttps://mswjs.io/docs',
      'font-weight:bold',
      'font-weight:normal',
    )
    // eslint-disable-next-line no-console
    console.log('Found an issue? https://github.com/mswjs/msw/issues')

    // eslint-disable-next-line no-console
    console.log('Worker script URL:', serviceWorkerUrl)

    // eslint-disable-next-line no-console
    console.log('Worker scope:', registration.scope)

    if (client) {
      // eslint-disable-next-line no-console
      console.log('Client ID: %s (%s)', client.id, client.frameType)
    }

    console.groupEnd()
  }
}

class ServiceWorkerHttpNetworkFrame extends HttpNetworkFrame {
  #event: RequestEvent

  constructor(args: { request: Request; event: RequestEvent }) {
    super({ request: args.request })
    this.#event = args.event
  }

  public respondWith(response?: Response): void {
    if (response) {
      this.#respondWith(response)
    }
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Response) {
      return this.respondWith(reason)
    }

    if (reason instanceof Error) {
      devUtils.error(
        `Uncaught exception in the request handler for "%s %s":

%s

This exception has been gracefully handled as a 500 response, however, it's strongly recommended to resolve this error, as it indicates a mistake in your code. If you wish to mock an error response, please see this guide: https://mswjs.io/docs/http/mocking-responses/error-responses`,
        this.data.request.method,
        this.data.request.url,
        reason.stack ?? reason,
      )

      // Treat exceptions during the request handling as 500 responses.
      // This should alert the developer that there's a problem.
      this.respondWith(
        HttpResponse.json(
          {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
          },
          {
            status: 500,
            statusText: 'Request Handler Error',
          },
        ),
      )
    }
  }

  public passthrough(): void {
    this.#event.postMessage('PASSTHROUGH')
  }

  async #respondWith(response: Response): Promise<void> {
    let responseBody: ReadableStream<any> | ArrayBuffer | null
    let transfer: [ReadableStream<Uint8Array>] | undefined

    const responseInit = toResponseInit(response)

    // Decide whether to transfer the stream in the environments
    // that support that or exhaust the stream and send the response body
    // as a buffer.
    if (supportsReadableStreamTransfer()) {
      responseBody = response.body
      transfer = response.body ? [response.body] : undefined
    } else {
      responseBody =
        response.body == null ? null : await response.clone().arrayBuffer()
    }

    this.#event.postMessage(
      'MOCK_RESPONSE',
      {
        ...responseInit,
        body: responseBody,
      },
      transfer,
    )
  }
}
