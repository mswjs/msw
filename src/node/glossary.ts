import { MockedResponse as MockedInterceptedResponse } from 'node-request-interceptor'
import { SharedOptions } from '../sharedOptions'
import { RequestHandlersList } from '../setupWorker/glossary'
import { MockedRequest } from '../utils/handlers/requestHandler'

export interface ServerLifecycleEventsMap {
  'request:start': (req: MockedRequest) => void
  'request:match': (req: MockedRequest) => void
  'request:unhandled': (req: MockedRequest) => void
  'request:end': (req: MockedRequest) => void
  'response:mocked': (res: MockedInterceptedResponse, requestId: string) => void
  'response:bypass': (res: MockedInterceptedResponse, requestId: string) => void
}

export interface SetupServerApi {
  /**
   * Starts requests interception based on the previously provided request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/listen `server.listen()`}
   */
  listen(options?: SharedOptions): void

  /**
   * Stops requests interception by restoring all augmented modules.
   * @see {@link https://mswjs.io/docs/api/setup-server/close `server.close()`}
   */
  close(): void

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/use `server.use()`}
   */
  use(...handlers: RequestHandlersList): void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   * @see {@link https://mswjs.io/docs/api/setup-server/restore-handlers `server.restore-handlers()`}
   */
  restoreHandlers(): void

  /**
   * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
   * @see {@link https://mswjs.io/docs/api/setup-server/reset-handlers `server.reset-handlers()`}
   */
  resetHandlers(...nextHandlers: RequestHandlersList): void

  /**
   * Lists all active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/print-handlers `server.print-handlers()`}
   */
  printHandlers(): void

  /**
   * Attaches a listener to one of the life-cycle events.
   */
  on<EventType extends keyof ServerLifecycleEventsMap>(
    eventType: EventType,
    listener: ServerLifecycleEventsMap[EventType],
  ): void
}
