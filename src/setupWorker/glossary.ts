import { HeadersList } from 'headers-utils'
import { RequestHandler } from '../utils/handlers/requestHandler'
import { MockedResponse } from '../response'
import { SharedOptions } from '../sharedOptions'
import { ServiceWorkerMessage } from '../utils/createBroadcastChannel'

export type Mask = RegExp | string
export type ResolvedMask = Mask | URL

export interface SetupWorkerInternalContext {
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
  requestHandlers: RequestHandler<any, any>[]
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
    /**
     * Awaits a given message type from the Service Worker.
     */
    once<T>(type: string): Promise<ServiceWorkerMessage<T>>
  }
}

export type ServiceWorkerInstanceTuple = [
  ServiceWorker | null,
  ServiceWorkerRegistration,
]

export type StartOptions = SharedOptions & {
  serviceWorker?: {
    url?: string
    options?: RegistrationOptions
  }

  /**
   * Disable the logging of captured requests
   * into browser's console.
   */
  quiet?: boolean

  /**
   * Defer any network requests until the Service Worker
   * instance is ready. Defaults to `true`.
   */
  waitUntilReady?: boolean
}

export type RequestHandlersList = RequestHandler<any, any>[]

export type ResponseWithSerializedHeaders = Omit<MockedResponse, 'headers'> & {
  headers: HeadersList
}
