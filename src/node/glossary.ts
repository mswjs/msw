import type { PartialDeep } from 'type-fest'
import {
  RequestHandler,
  RequestHandlerDefaultInfo,
} from '~/core/handlers/RequestHandler'
import {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
  SharedOptions,
} from '~/core/sharedOptions'

export interface SetupServer {
  /**
   * Starts requests interception based on the previously provided request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/listen `server.listen()`}
   */
  listen(options?: PartialDeep<SharedOptions>): Promise<void>

  /**
   * Stops requests interception by restoring all augmented modules.
   * @see {@link https://mswjs.io/docs/api/setup-server/close `server.close()`}
   */
  close(): void

  /**
   * Prepends given request handlers to the list of existing handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/use `server.use()`}
   */
  use(...handlers: Array<RequestHandler>): void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   * @see {@link https://mswjs.io/docs/api/setup-server/restore-handlers `server.restore-handlers()`}
   */
  restoreHandlers(): void

  /**
   * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
   * @see {@link https://mswjs.io/docs/api/setup-server/reset-handlers `server.reset-handlers()`}
   */
  resetHandlers(...nextHandlers: Array<RequestHandler>): void

  /**
   * Returns a readonly list of currently active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/list-handlers `server.listHandlers()`}
   */
  listHandlers(): ReadonlyArray<RequestHandler<RequestHandlerDefaultInfo, any>>

  /**
   * Lists all active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/print-handlers `server.print-handlers()`}
   */
  printHandlers(): void

  events: LifeCycleEventEmitter<LifeCycleEventsMap>
}
