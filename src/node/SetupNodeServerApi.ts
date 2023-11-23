import { defaultMaxListeners, setMaxListeners } from 'node:events'
import { SetupServerApi } from './SetupServerApi'
import { SetupServer } from './glossary'
import { isNodeExceptionLike } from './utils/isNodeExceptionLike'

export class SetupNodeServerApi extends SetupServerApi implements SetupServer {
  /**
   * Bump the maximum number of event listeners on the
   * request's "AbortSignal". This prepares the request
   * for each request handler cloning it at least once.
   * Note that cloning a request automatically appends a
   * new "abort" event listener to the parent request's
   * "AbortController" so if the parent aborts, all the
   * clones are automatically aborted.
   */
  private async setRequestAbortSignalMaxListeners(
    request: Request,
  ): Promise<void> {
    try {
      setMaxListeners(
        Math.max(defaultMaxListeners, this.currentHandlers.length),
        request.signal,
      )
    } catch (error: unknown) {
      /**
       * @note Mock environments (JSDOM, ...) are not able to implement an internal
       * "kIsNodeEventTarget" Symbol that Node.js uses to identify Node.js `EventTarget`s.
       * `setMaxListeners` throws an error for non-Node.js `EventTarget`s.
       * At the same time, mock environments are also not able to implement the
       * internal "events.maxEventTargetListenersWarned" Symbol, which results in
       * "MaxListenersExceededWarning" not being printed by Node.js for those anyway.
       * The main reason for using `setMaxListeners` is to suppress these warnings in Node.js,
       * which won't be printed anyway if `setMaxListeners` fails.
       */
      if (
        !(isNodeExceptionLike(error) && error.code === 'ERR_INVALID_ARG_TYPE')
      ) {
        throw error
      }
    }
  }

  protected override onRequestIntercepted(request: Request): void {
    super.onRequestIntercepted(request)
    this.setRequestAbortSignalMaxListeners(request)
  }
}
