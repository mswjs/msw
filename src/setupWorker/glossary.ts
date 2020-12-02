import { HeadersList } from 'headers-utils'
import { RequestHandler } from '../utils/handlers/requestHandler'
import { MockedResponse } from '../response'
import { SharedOptions } from '../sharedOptions'
import {
  EventsMap,
  StrictEventEmitter,
} from '../utils/lifecycle/StrictEventEmitter'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'
import { createStart } from './start/createStart'
import { createStop } from './stop/createStop'

export type Mask = RegExp | string
export type ResolvedMask = Mask | URL

export interface ServiceWorkerIncomingEventsMap {
  MOCKING_ENABLED: boolean
  INTEGRITY_CHECK_RESPONSE: string
  KEEPALIVE_RESPONSE: never
  REQUEST: any /** @todo */
}

export interface SetupWorkerInternalContext {
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
  requestHandlers: RequestHandler<any, any>[]
  emitter: StrictEventEmitter
  keepAliveInterval?: number
  events: {
    /**
     * Adds an event listener on the given target.
     * Returns a clean up function that removes that listener.
     */
    addListener<E extends Event>(
      target: EventTarget,
      type: string,
      listener: (event: E) => void,
    ): () => void
    /**
     * Removes all currently attached listeners.
     */
    removeAllListeners(): void
    on<EventType extends keyof ServiceWorkerIncomingEventsMap>(
      type: EventType,
      callback: (
        event: MessageEvent,
        message: ServiceWorkerMessage<
          EventType,
          ServiceWorkerIncomingEventsMap[EventType]
        >,
      ) => void,
    ): void
    /**
     * Awaits a given message type from the Service Worker.
     */
    once<EventType extends keyof ServiceWorkerIncomingEventsMap>(
      type: EventType,
    ): Promise<
      ServiceWorkerMessage<EventType, ServiceWorkerIncomingEventsMap[EventType]>
    >
  }
}

export type ServiceWorkerInstanceTuple = [
  ServiceWorker | null,
  ServiceWorkerRegistration,
]

export type FindWorker = (
  scriptUrl: string,
  mockServiceWorkerUrl: string,
) => boolean

export type StartOptions = SharedOptions & {
  /**
   * Service Worker instance options.
   */
  serviceWorker?: {
    url?: string
    options?: RegistrationOptions
  }

  /**
   * Disables the logging of captured requests
   * into browser's console.
   */
  quiet?: boolean

  /**
   * Defers any network requests until the Service Worker
   * instance is ready. Defaults to `true`.
   */
  waitUntilReady?: boolean

  /**
   * A custom lookup function to find a Mock Service Worker in the list
   * of all registered Service Workers on the page.
   */
  findWorker?: FindWorker
}

export type RequestHandlersList = RequestHandler<any, any, any, any, any>[]

export type ResponseWithSerializedHeaders<BodyType = any> = Omit<
  MockedResponse<BodyType>,
  'headers'
> & {
  headers: HeadersList
}

export interface SetupWorkerApi {
  /**
   * Registers and activates the mock Service Worker.
   * @see {@link https://mswjs.io/docs/api/setup-worker/start `worker.start()`}
   */
  start: ReturnType<typeof createStart>

  /**
   * Stops requests interception for the current client.
   * @see {@link https://mswjs.io/docs/api/setup-worker/stop `worker.stop()`}
   */
  stop: ReturnType<typeof createStop>

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @param {RequestHandler[]} handlers List of runtime request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/use `worker.use()`}
   */
  use: (...handlers: RequestHandlersList) => void

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
  resetHandlers: (...nextHandlers: RequestHandlersList) => void

  /**
   * Lists all active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-worker/print-handlers `worker.printHandlers()`}
   */
  printHandlers: () => void

  on<EventType extends keyof EventsMap>(
    event: EventType,
    listener: EventsMap[EventType],
  ): void
}
