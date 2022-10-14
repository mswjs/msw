import { HeadersObject } from 'headers-polyfill'
import { StrictEventEmitter } from 'strict-event-emitter'
import {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
  SharedOptions,
} from '../sharedOptions'
import { ServiceWorkerMessage } from './start/utils/createMessageChannel'
import {
  DefaultBodyType,
  RequestHandler,
  RequestHandlerDefaultInfo,
} from '../handlers/RequestHandler'
import type { HttpRequestEventMap, Interceptor } from '@mswjs/interceptors'
import { Path } from '../utils/matching/matchRequestUrl'
import { RequiredDeep } from '../typeUtils'

export type ResolvedPath = Path | URL

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
   * Unique UUID of the request generated once the request is
   * captured by the "fetch" event in the Service Worker.
   */
  id: string

  /**
   * Text response body.
   */
  body?: string
}

export type ServiceWorkerIncomingResponse = Pick<
  Response,
  'type' | 'ok' | 'status' | 'statusText' | 'body' | 'headers' | 'redirected'
> & {
  requestId: string
}

/**
 * Map of the events that can be received from the Service Worker.
 */
export interface ServiceWorkerIncomingEventsMap {
  MOCKING_ENABLED: boolean
  INTEGRITY_CHECK_RESPONSE: string
  KEEPALIVE_RESPONSE: never
  REQUEST: ServiceWorkerIncomingRequest
  RESPONSE: ServiceWorkerIncomingResponse
}

/**
 * Map of the events that can be sent to the Service Worker
 * from any execution context.
 */
export type ServiceWorkerOutgoingEventTypes =
  | 'MOCK_ACTIVATE'
  | 'MOCK_DEACTIVATE'
  | 'INTEGRITY_CHECK_REQUEST'
  | 'KEEPALIVE_REQUEST'
  | 'CLIENT_CLOSED'

/**
 * Map of the events that can be sent to the Service Worker
 * only as a part of a single `fetch` event handler.
 */
export interface ServiceWorkerFetchEventMap {
  MOCK_RESPONSE(payload: SerializedResponse): void
  MOCK_RESPONSE_START(payload: SerializedResponse): void

  MOCK_NOT_FOUND(): void
  NETWORK_ERROR(payload: { name: string; message: string }): void
  INTERNAL_ERROR(payload: { status: number; body: string }): void
}

export interface ServiceWorkerBroadcastChannelMessageMap {
  MOCK_RESPONSE_CHUNK(payload: Uint8Array): void
  MOCK_RESPONSE_END(): void
}

export interface SetupWorkerInternalContext {
  isMockingEnabled: boolean
  startOptions?: RequiredDeep<StartOptions>
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
  requestHandlers: RequestHandler[]
  emitter: StrictEventEmitter<LifeCycleEventsMap>
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
    addListener<EventType extends Event = Event>(
      target: EventTarget,
      eventType: string,
      listener: (event: EventType) => void,
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
  useFallbackMode: boolean
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
     * @default "./mockServiceWorker.js"
     */
    url?: string
    options?: RegistrationOptions
  }

  /**
   * Disables the logging of captured requests
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

export interface SerializedResponse<BodyType extends DefaultBodyType = any> {
  status: number
  statusText: string
  headers: HeadersObject
  body: BodyType
  delay?: number
}

export type StartReturnType = Promise<ServiceWorkerRegistration | undefined>
export type StartHandler = (
  options: RequiredDeep<StartOptions>,
  initialOptions: StartOptions,
) => StartReturnType
export type StopHandler = () => void

export interface SetupWorkerApi {
  /**
   * Registers and activates the mock Service Worker.
   * @see {@link https://mswjs.io/docs/api/setup-worker/start `worker.start()`}
   */
  start: (options?: StartOptions) => StartReturnType

  /**
   * Stops requests interception for the current client.
   * @see {@link https://mswjs.io/docs/api/setup-worker/stop `worker.stop()`}
   */
  stop: StopHandler

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @param {RequestHandler[]} handlers List of runtime request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/use `worker.use()`}
   */
  use: (...handlers: RequestHandler[]) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   * @see {@link https://mswjs.io/docs/api/setup-worker/restore-handlers `worker.restoreHandlers()`}
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupWorker` call, or to the explicit next request handlers list, if given.
   * @param {RequestHandler[]} nextHandlers List of the new initial request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/reset-handlers `worker.resetHandlers()`}
   */
  resetHandlers: (...nextHandlers: RequestHandler[]) => void

  /**
   * Returns a readonly list of currently active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/list-handlers `worker.listHandlers()`}
   */
  listHandlers(): ReadonlyArray<RequestHandler<RequestHandlerDefaultInfo, any>>

  /**
   * Lists all active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/print-handlers `worker.printHandlers()`}
   */
  printHandlers: () => void

  events: LifeCycleEventEmitter<LifeCycleEventsMap>
}
