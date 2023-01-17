import { Emitter } from 'strict-event-emitter'
import { MockedRequest } from './utils/request/MockedRequest'
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
  'request:start': [MockedRequest]
  'request:match': [MockedRequest]
  'request:unhandled': [MockedRequest]
  'request:end': [MockedRequest]
  'response:mocked': [response: ResponseType, requestId: string]
  'response:bypass': [response: ResponseType, requestId: string]
  unhandledException: [error: Error, request: MockedRequest]
  [key: string]: Array<unknown>
}

export type LifeCycleEventEmitter<
  ResponseType extends Record<string | symbol, any>,
> = Pick<Emitter<ResponseType>, 'on' | 'removeListener' | 'removeAllListeners'>
