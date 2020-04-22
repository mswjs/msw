import { RequestHandler } from '../handlers/requestHandler'

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
  quiet?: boolean
}
