import { HeadersList } from 'headers-utils'
import { RequestHandler } from '../handlers/requestHandler'
import { MockedResponse } from '../response'

export type Mask = RegExp | string

export interface ComposeMocksInternalContext {
  worker: ServiceWorker | null
  registration: ServiceWorkerRegistration | null
  requestHandlers: RequestHandler<any, any>[]
}

export type ServiceWorkerInstanceTuple = [
  ServiceWorker | null,
  ServiceWorkerRegistration,
]

export interface StartOptions {
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
   * instance is ready.
   */
  waitUntilReady?: boolean
}

export type RequestHandlersList = RequestHandler<any, any>[]

export type ResponseWithSerializedHeaders = Omit<MockedResponse, 'headers'> & {
  headers: HeadersList
}
