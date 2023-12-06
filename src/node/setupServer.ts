import { ClientRequestInterceptor } from '@mswjs/interceptors/ClientRequest'
import { XMLHttpRequestInterceptor } from '@mswjs/interceptors/XMLHttpRequest'
import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { defaultMaxListeners, setMaxListeners } from 'node:events'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { SetupServerApi as BaseSetupServerApi } from './SetupServerApi'
import { SetupServer } from './glossary'
import { isNodeExceptionLike } from './utils/isNodeExceptionLike'

class SetupServerApi extends BaseSetupServerApi implements SetupServer {
  /**
   * Bump the maximum number of event listeners on the
   * request's "AbortSignal". This prepares the request
   * for each request handler cloning it at least once.
   * Note that cloning a request automatically appends a
   * new "abort" event listener to the parent request's
   * "AbortController" so if the parent aborts, all the
   * clones are automatically aborted.
   */
  protected override onRequest(request: Request): void {
    try {
      if (typeof setMaxListeners === 'function') {
        setMaxListeners(
          Math.max(defaultMaxListeners, this.currentHandlers.length),
          request.signal,
        )
      }
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
}

/**
 * Sets up a requests interception in Node.js with the given request handlers.
 * @param {RequestHandler[]} handlers List of request handlers.
 *
 * @see {@link https://mswjs.io/docs/api/setup-server `setupServer()` API reference}
 */
export const setupServer = (
  ...handlers: Array<RequestHandler>
): SetupServer => {
  return new SetupServerApi(
    [ClientRequestInterceptor, XMLHttpRequestInterceptor, FetchInterceptor],
    ...handlers,
  )
}
