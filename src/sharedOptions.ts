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

export interface LifeCycleEventsMap {
  'request:start': (request: Request, requestId: string) => void
  'request:match': (request: Request, requestId: string) => void
  'request:unhandled': (request: Request, requestId: string) => void
  'request:end': (request: Request, requestId: string) => void
  'response:mocked': (
    response: Response,
    request: Request,
    requestId: string,
  ) => void
  'response:bypass': (
    response: Response,
    request: Request,
    requestId: string,
  ) => void
  unhandledException: (
    error: Error,
    request: Request,
    requestId: string,
  ) => void
}

export type LifeCycleEventEmitter<
  EventsMap extends Record<string | symbol, any>,
> = Pick<
  StrictEventEmitter<EventsMap>,
  'on' | 'removeListener' | 'removeAllListeners'
>
