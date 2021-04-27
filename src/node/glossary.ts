import { PartialDeep } from 'type-fest'
import { IsomorphicResponse } from '@mswjs/interceptors'
import { MockedRequest, RequestHandler } from '../handlers/RequestHandler'
import { SharedOptions } from '../sharedOptions'

export interface ServerLifecycleEventsMap {
  'request:start': (request: MockedRequest) => void
  'request:match': (request: MockedRequest) => void
  'request:unhandled': (request: MockedRequest) => void
  'request:end': (request: MockedRequest) => void
  'response:mocked': (response: IsomorphicResponse, requestId: string) => void
  'response:bypass': (response: IsomorphicResponse, requestId: string) => void
}

export interface SetupServerApi {
  /**
   * Starts requests interception based on the previously provided request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/listen `server.listen()`}
   */
  listen(options?: PartialDeep<SharedOptions>): void

  /**
   * Stops requests interception by restoring all augmented modules.
   * @see {@link https://mswjs.io/docs/api/setup-server/close `server.close()`}
   */
  close(): void

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/use `server.use()`}
   */
  use(...handlers: RequestHandler[]): void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   * @see {@link https://mswjs.io/docs/api/setup-server/restore-handlers `server.restore-handlers()`}
   */
  restoreHandlers(): void

  /**
   * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
   * @see {@link https://mswjs.io/docs/api/setup-server/reset-handlers `server.reset-handlers()`}
   */
  resetHandlers(...nextHandlers: RequestHandler[]): void

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
