import { SharedOptions } from '../sharedOptions'
import { RequestHandlersList } from '../setupWorker/glossary'

export interface SetupServerApi {
  /**
   * Enables requests interception based on the previously provided mock definition.
   */
  listen: (options?: SharedOptions) => void

  /**
   * Prepends given request handlers to the list of existing handlers.
   */
  use: (...handlers: RequestHandlersList) => void

  /**
   * Marks all request handlers that respond using `res.once()` as unused.
   */
  restoreHandlers: () => void

  /**
   * Resets request handlers to the initial list given to the `setupServer` call, or to the explicit next request handlers list, if given.
   */
  resetHandlers: (...nextHandlers: RequestHandlersList) => void

  /**
   * Stops requests interception by restoring all augmented modules.
   */
  close: () => void
}
