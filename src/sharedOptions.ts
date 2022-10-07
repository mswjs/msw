import { StrictEventEmitter } from 'strict-event-emitter'
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
  'request:start': (request: Request) => void
  'request:match': (request: Request) => void
  'request:unhandled': (request: Request) => void
  'request:end': (request: Request) => void
  'response:mocked': (response: ResponseType, requestId: string) => void
  'response:bypass': (response: ResponseType, requestId: string) => void
  unhandledException: (error: Error, request: Request) => void
}

export type LifeCycleEventEmitter<
  ResponseType extends Record<string | symbol, any>,
> = Pick<
  StrictEventEmitter<ResponseType>,
  'on' | 'removeListener' | 'removeAllListeners'
>
