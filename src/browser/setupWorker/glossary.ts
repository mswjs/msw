import { Emitter } from 'strict-event-emitter'
import {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
  SharedOptions,
} from '~/core/sharedOptions'
import { ServiceWorkerMessage } from './start/utils/createMessageChannel'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import type { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import type { RequiredDeep } from '~/core/typeUtils'
import type { WebSocketHandler } from '~/core/handlers/WebSocketHandler'

type RequestWithoutMethods = Omit<
  Request,
  | 'text'
  | 'body'
  | 'json'
  | 'blob'
  | 'arrayBuffer'
  | 'formData'
  | 'clone'
  | 'signal'
  | 'isHistoryNavigation'
  | 'isReloadNavigation'
>

/**
 * Request representation received from the worker message event.
 */
export interface ServiceWorkerIncomingRequest extends RequestWithoutMethods {
  /**
   * Unique ID of the request generated once the request is
   * intercepted by the "fetch" event in the Service Worker.
   */
  id: string
  body?: ArrayBuffer | null
}

type ServiceWorkerIncomingResponse = {
  isMockedResponse: boolean
  request: ServiceWorkerIncomingRequest
  response: Pick<
    Response,
    'type' | 'ok' | 'status' | 'statusText' | 'body' | 'headers' | 'redirected'
  >
}

/**
 * Map of the events that can be received from the Service Worker.
 */
export interface ServiceWorkerIncomingEventsMap {
  MOCKING_ENABLED: {
    client: {
      id: string
      frameType: string
    }
  }
  INTEGRITY_CHECK_RESPONSE: {
    packageVersion: string
    checksum: string
  }
  KEEPALIVE_RESPONSE: never
  REQUEST: ServiceWorkerIncomingRequest
  RESPONSE: ServiceWorkerIncomingResponse
}

/**
 * Map of the events that can be sent to the Service Worker
 * from any execution context.
 */
type ServiceWorkerOutgoingEventTypes =
  | 'MOCK_ACTIVATE'
  | 'MOCK_DEACTIVATE'
  | 'INTEGRITY_CHECK_REQUEST'
  | 'KEEPALIVE_REQUEST'
  | 'CLIENT_CLOSED'

export interface StringifiedResponse extends ResponseInit {
  body: string | ArrayBuffer | ReadableStream<Uint8Array> | null
}

interface StrictEventListener<EventType extends Event> {
  (event: EventType): void
}

export interface SetupWorkerInternalContext {
  isMockingEnabled: boolean
  startOptions: RequiredDeep<StartOptions>
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
  getRequestHandlers: () => Array<RequestHandler | WebSocketHandler>
  emitter: Emitter<LifeCycleEventsMap>
  keepAliveInterval?: number
  workerChannel: {
    /**
     * Adds a Service Worker event listener.
     */
    on<EventType extends keyof ServiceWorkerIncomingEventsMap>(
      eventType: EventType,
      callback: (
        event: MessageEvent,
        message: ServiceWorkerMessage<
          EventType,
          ServiceWorkerIncomingEventsMap[EventType]
        >,
      ) => void,
    ): void
    send<EventType extends ServiceWorkerOutgoingEventTypes>(
      eventType: EventType,
    ): void
  }
  events: {
    /**
     * Adds an event listener on the given target.
     * Returns a clean-up function that removes that listener.
     */
    addListener<EventType extends Event>(
      target: EventTarget,
      eventType: string,
      callback: StrictEventListener<EventType>,
    ): () => void
    /**
     * Removes all currently attached listeners.
     */
    removeAllListeners(): void
    /**
     * Awaits a given message type from the Service Worker.
     */
    once<EventType extends keyof ServiceWorkerIncomingEventsMap>(
      eventType: EventType,
    ): Promise<
      ServiceWorkerMessage<EventType, ServiceWorkerIncomingEventsMap[EventType]>
    >
  }
  supports: {
    serviceWorkerApi: boolean
    readableStreamTransfer: boolean
  }
  fallbackInterceptor?: Interceptor<HttpRequestEventMap>
}

export type ServiceWorkerInstanceTuple = [
  ServiceWorker | null,
  ServiceWorkerRegistration,
]

export type FindWorker = (
  scriptUrl: string,
  mockServiceWorkerUrl: string,
) => boolean

export interface StartOptions extends SharedOptions {
  /**
   * Service Worker registration options.
   */
  serviceWorker?: {
    /**
     * Custom url to the worker script.
     * @default "/mockServiceWorker.js"
     */
    url?: string
    options?: RegistrationOptions
  }

  /**
   * Disables the logging of the intercepted requests
   * into browser's console.
   * @default false
   */
  quiet?: boolean

  /**
   * Defers any network requests until the Service Worker
   * instance is activated.
   * @default true
   */
  waitUntilReady?: boolean

  /**
   * A custom lookup function to find a Mock Service Worker in the list
   * of all registered Service Workers on the page.
   */
  findWorker?: FindWorker
}

export type StartReturnType = Promise<ServiceWorkerRegistration | undefined>
export type StartHandler = (
  options: RequiredDeep<StartOptions>,
  initialOptions: StartOptions,
) => StartReturnType
export type StopHandler = () => void

export interface SetupWorker {
  /**
   * Registers and activates the mock Service Worker.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/start `worker.start()` API reference}
   */
  start: (options?: StartOptions) => StartReturnType

  /**
   * Stops requests interception for the current client.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/stop `worker.stop()` API reference}
   */
  stop: StopHandler

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @param {RequestHandler[]} handlers List of runtime request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/use `worker.use()` API reference}
   */
  use: (...handlers: Array<RequestHandler | WebSocketHandler>) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/restore-handlers `worker.restoreHandlers()` API reference}
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupWorker` call, or to the explicit next request handlers list, if given.
   * @param {RequestHandler[]} nextHandlers List of the new initial request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/reset-handlers `worker.resetHandlers()` API reference}
   */
  resetHandlers: (
    ...nextHandlers: Array<RequestHandler | WebSocketHandler>
  ) => void

  /**
   * Returns a readonly list of currently active request handlers.
   *
   * @see {@link https://mswjs.io/docs/api/setup-worker/list-handlers `worker.listHandlers()` API reference}
   */
  listHandlers(): ReadonlyArray<RequestHandler | WebSocketHandler>

  /**
   * Life-cycle events.
   * Life-cycle events allow you to subscribe to the internal library events occurring during the request/response handling.
   *
   * @see {@link https://mswjs.io/docs/api/life-cycle-events Life-cycle Events API reference}
   */
  events: LifeCycleEventEmitter<LifeCycleEventsMap>
}
