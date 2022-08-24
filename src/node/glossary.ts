
import type { PartialDeep } from 'type-fest'
import type { IsomorphicResponse } from '@mswjs/interceptors'
import { DefaultBodyType, RequestHandler, RequestHandlerDefaultInfo } from '../handlers/RequestHandler'
import {
  LifeCycleEventEmitter,
  LifeCycleEventsMap,
  SharedOptions,
} from '../sharedOptions'
import { MockedRequest } from '../utils/request/MockedRequest'

export type ServerLifecycleEventsMap = LifeCycleEventsMap<IsomorphicResponse>

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
 * Returns lists of all active request handlers.
 * @see {@link https://mswjs.io/docs/api/setup-server/list-handlers `server.list-handlers()`}
 */
  listHandlers(): RequestHandler<RequestHandlerDefaultInfo, MockedRequest<DefaultBodyType>, any, MockedRequest<DefaultBodyType>>[]

  /**
   * Lists all active request handlers.
   * @see {@link https://mswjs.io/docs/api/setup-server/print-handlers `server.print-handlers()`}
   */
  printHandlers(): void

  events: LifeCycleEventEmitter<ServerLifecycleEventsMap>
}