import { invariant } from 'outvariant'
import { Emitter, TypedEvent } from 'rettime'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { FetchResponse } from '@mswjs/interceptors'
import { NetworkSource } from '#core/new/sources/network-source'
import { RequestHandler } from '#core/handlers/RequestHandler'
import { HttpNetworkFrame } from '#core/new/frames/http-frame'
import { HttpResponse } from '#core/HttpResponse'
import { toResponseInit } from '#core/utils/toResponseInit'
import { devUtils } from '#core/utils/internal/devUtils'
import {
  supportsReadableStreamTransfer,
  supportsServiceWorker,
} from '../utils/supports'
import { getWorkerInstance } from '../utils/get-worker-instance'
import { WorkerChannel, WorkerChannelEventMap } from '../utils/workerChannel'
import { FindWorker } from '../glossary'
import { deserializeRequest } from '../utils/deserializeRequest'

export interface ServiceWorkerSourceOptions {
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

type WorkerChannelClient =
  WorkerChannelEventMap['MOCKING_ENABLED']['data']['client']

export class ServiceWorkerSource extends NetworkSource<ServiceWorkerHttpNetworkFrame> {
  #frames: Map<string, ServiceWorkerHttpNetworkFrame>
  #channel: WorkerChannel
  #workerPromise: DeferredPromise<[ServiceWorker, ServiceWorkerRegistration]>
  #clientPromise?: Promise<WorkerChannelClient>
  #keepAliveInterval?: number
  #stoppedAt?: number

  constructor(private readonly options: ServiceWorkerSourceOptions) {
    super()

    invariant(
      supportsServiceWorker(),
      'Failed to use Service Worker as the network source: the Service Worker API is not supported in this environment',
    )

    this.#frames = new Map()
    this.#workerPromise = new DeferredPromise()
    this.#channel = new WorkerChannel({
      worker: this.#workerPromise.then(([worker]) => worker),
    })
  }

  public async enable(): Promise<ServiceWorkerRegistration> {
    this.#stoppedAt = undefined

    if (this.#workerPromise.state !== 'pending') {
      devUtils.warn(
        'Found a redundant "worker.start()" call. Note that starting the worker while mocking is already enabled will have no effect. Consider removing this "worker.start()" call.',
      )

      return this.#workerPromise.then(([, registration]) => registration)
    }

    const [worker, registration] = await this.#startWorker()

    if (worker.state !== 'activated') {
      const controller = new AbortController()
      const activationPromise = new DeferredPromise<void>()
      activationPromise.then(() => controller.abort())

      worker.addEventListener(
        'statechange',
        () => {
          if (worker.state === 'activated') {
            activationPromise.resolve()
          }
        },
        { signal: controller.signal },
      )

      await activationPromise
    }

    this.#channel.postMessage('MOCK_ACTIVATE')

    const clientConfirmationPromise = new DeferredPromise<WorkerChannelClient>()
    this.#clientPromise = clientConfirmationPromise

    this.#channel.once('MOCKING_ENABLED', (event) => {
      clientConfirmationPromise.resolve(event.data.client)
    })
    await clientConfirmationPromise

    return registration
  }

  public async disable(): Promise<void> {
    await super.disable()

    this.#stoppedAt = Date.now()
    this.#frames.clear()
    this.#channel.removeAllListeners()
    this.#workerPromise = new DeferredPromise()

    this.#printStopMessage()
  }

  async #startWorker() {
    if (this.#keepAliveInterval) {
      clearInterval(this.#keepAliveInterval)
    }

    const workerUrl = this.options.serviceWorker.url

    const [worker, registration] = await getWorkerInstance(
      workerUrl,
      this.options.serviceWorker.options,
      this.options.findWorker || this.#defaultFindWorker,
    )

    if (worker == null) {
      const missingWorkerMessage = this.options?.findWorker
        ? devUtils.formatMessage(
            `Failed to locate the Service Worker registration using a custom "findWorker" predicate.

Please ensure that the custom predicate properly locates the Service Worker registration at "%s".
More details: https://mswjs.io/docs/api/setup-worker/start#findworker
     `,
            workerUrl,
          )
        : devUtils.formatMessage(
            `Failed to locate the Service Worker registration.

This most likely means that the worker script URL "%s" cannot resolve against the actual public hostname (%s). This may happen if your application runs behind a proxy, or has a dynamic hostname.

Please consider using a custom "serviceWorker.url" option to point to the actual worker script location, or a custom "findWorker" option to resolve the Service Worker registration manually. More details: https://mswjs.io/docs/api/setup-worker/start`,
            workerUrl,
            location.host,
          )

      throw new Error(missingWorkerMessage)
    }

    this.#workerPromise.resolve([worker, registration])

    this.#channel.on('REQUEST', this.#handleRequest.bind(this))
    this.#channel.on('RESPONSE', this.#handleResponse.bind(this))

    window.addEventListener('beforeunload', () => {
      if (worker.state !== 'redundant') {
        this.#channel.postMessage('CLIENT_CLOSED')
      }

      clearInterval(this.#keepAliveInterval)

      window.postMessage({ type: 'msw/worker:stop' })
    })

    await this.#checkWorkerIntegrity().catch((error) => {
      devUtils.error(
        'Error while checking the worker script integrity. Please report this on GitHub (https://github.com/mswjs/msw/issues) and include the original error below.',
      )
      console.error(error)
    })

    this.#keepAliveInterval = window.setInterval(() => {
      this.#channel.postMessage('KEEPALIVE_REQUEST')
    }, 5000)

    return [worker, registration] as const
  }

  async #handleRequest(event: RequestEvent): Promise<void> {
    // Passthrough any requests performed after the interception was stopped.
    if (this.#stoppedAt && event.data.interceptedAt > this.#stoppedAt) {
      return event.postMessage('PASSTHROUGH')
    }

    const request = deserializeRequest(event.data)
    RequestHandler.cache.set(request, request.clone())

    const frame = new ServiceWorkerHttpNetworkFrame({
      event,
      request,
    })
    this.#frames.set(event.data.id, frame)

    await this.queue(frame)
  }

  async #handleResponse(event: ResponseEvent): Promise<void> {
    const { request, response, isMockedResponse } = event.data

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

    const frame = this.#frames.get(request.id)
    this.#frames.delete(request.id)

    invariant(
      frame != null,
      'Failed to handle a worker response for request "%s %s": request frame is missing',
      request.method,
      request.url,
    )

    const fetchRequest = deserializeRequest(request)
    const fetchResponse =
      response.status === 0
        ? Response.error()
        : new FetchResponse(response.body, response)

    frame.events.emit(
      new TypedEvent(isMockedResponse ? 'response:mocked' : 'response:bypass', {
        data: {
          requestId: request.id,
          request: fetchRequest,
          response: fetchResponse,
          isMockedResponse,
        },
      }),
    )
  }

  #defaultFindWorker: FindWorker = (workerUrl, mockServiceWorkerUrl) => {
    return workerUrl === mockServiceWorkerUrl
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

  public async printStartMessage() {
    if (this.options.quiet || this.#workerPromise.state === 'rejected') {
      return
    }

    invariant(
      this.#clientPromise != null,
      '[ServiceWorkerSource] Failed to print a start message: client confirmation not received',
    )

    const client = await this.#clientPromise
    const [worker, registration] = await this.#workerPromise

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
    console.log('Worker script URL:', worker.scriptURL)

    // eslint-disable-next-line no-console
    console.log('Worker scope:', registration.scope)

    if (client) {
      // eslint-disable-next-line no-console
      console.log('Client ID: %s (%s)', client.id, client.frameType)
    }

    console.groupEnd()
  }

  #printStopMessage(): void {
    if (this.options.quiet) {
      return
    }

    // eslint-disable-next-line no-console
    console.log(
      `%c${devUtils.formatMessage('Mocking disabled.')}`,
      'color:orangered;font-weight:bold;',
    )
  }
}

class ServiceWorkerHttpNetworkFrame extends HttpNetworkFrame {
  #event: RequestEvent

  constructor(options: { event: RequestEvent; request: Request }) {
    super({ request: options.request })
    this.#event = options.event
  }

  public passthrough(): void {
    this.#event.postMessage('PASSTHROUGH')
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

  async #respondWith(response: Response): Promise<void> {
    let responseBody: ReadableStream<Uint8Array> | ArrayBuffer | null
    let transfer: [ReadableStream<Uint8Array>] | undefined
    const responseInit = toResponseInit(response)

    if (supportsReadableStreamTransfer()) {
      responseBody = response.body
      transfer = response.body == null ? undefined : [response.body]
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
