import { StrictEventEmitter } from 'strict-event-emitter'
import { MockedRequest } from './handlers/RequestHandler'
import { UnhandledRequestStrategy } from './utils/request/onUnhandledRequest'

export interface SharedOptions {
  /**
   * Specifies how to react to a request that has no corresponding
   * request handler. Warns on unhandled requests by default.
   *
   * @example worker.start({ onUnhandledRequest: 'bypass' })
   * @example worker.start({ onUnhandledRequest: 'warn' })
   * @example server.listen({ onUnhandledRequest: 'error' })
   */
  onUnhandledRequest?: UnhandledRequestStrategy
}

export interface LifeCycleEventsMap<ResponseType> {
  'request:start': (request: MockedRequest) => void
  'request:match': (request: MockedRequest) => void
  'request:unhandled': (request: MockedRequest) => void
  'request:end': (request: MockedRequest) => void
  'response:mocked': (response: ResponseType, requestId: string) => void
  'response:bypass': (response: ResponseType, requestId: string) => void
  unhandledException: (error: Error, request: MockedRequest) => void
}

export type LifeCycleEventEmitter<ResponseType> = Pick<
  StrictEventEmitter<ResponseType>,
  'on' | 'removeListener' | 'removeAllListeners'
>
