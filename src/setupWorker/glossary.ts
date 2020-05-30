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
  quiet?: boolean
}

export type RequestHandlersList = RequestHandler<any, any>[]

export type ResponseWithSerializedHeaders = Omit<MockedResponse, 'headers'> & {
  headers: HeadersList
}
