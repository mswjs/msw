import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
} from '@mswjs/interceptors'
import { SetupApi } from '~/core/SetupApi'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '~/core/sharedOptions'
import { RequiredDeep } from '~/core/typeUtils'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { handleRequest } from '~/core/utils/handleRequest'
import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupServer, SetupServerInternalContext } from './glossary'
import { isNodeExceptionLike } from './utils/isNodeExceptionLike'
import { isProduction } from '~/core/utils/internal/isProduction'

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
  dangerouslyRunInProduction: false,
}

export class SetupServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServer
{
  private context: SetupServerInternalContext
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  private resolvedOptions: RequiredDeep<SharedOptions>

  constructor(
    interceptors: Array<{
      new (): Interceptor<HttpRequestEventMap>
    }>,
    ...handlers: Array<RequestHandler>
  ) {
    super(...handlers)

    this.context = this.createContext()
    this.interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })
    this.resolvedOptions = {} as RequiredDeep<SharedOptions>

    this.init()
  }

  private createContext(): SetupServerInternalContext {
    return {
      get nodeEvents() {
        return import('node:events')
          .then((events) => events)
          .catch(() => undefined)
      },
    }
  }

  /**
   * Subscribe to all requests that are using the interceptor object
   */
  private init(): void {
    this.interceptor.on('request', async ({ request, requestId }) => {
      await this.setRequestAbortSignalMaxListeners(request)

      const response = await handleRequest(
        request,
        requestId,
        this.currentHandlers,
        this.resolvedOptions,
        this.emitter,
      )

      if (response) {
        request.respondWith(response)
      }

      return
    })

    this.interceptor.on(
      'response',
      ({ response, isMockedResponse, request, requestId }) => {
        this.emitter.emit(
          isMockedResponse ? 'response:mocked' : 'response:bypass',
          {
            response,
            request,
            requestId,
          },
        )
      },
    )
  }

  public listen(options: Partial<SharedOptions> = {}): void {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<SharedOptions>

    invariant(
      !this.resolvedOptions.dangerouslyRunInProduction && isProduction(),
      devUtils.formatMessage(
        'Failed to call "setupWorker" in a production environment. Please make sure you enable API mocking conditionally so it doesn\'t leak to production.',
      ),
      'https://github.com/mswjs/msw/issues/1703',
    )
    // Apply the interceptor when starting the server.
    this.interceptor.apply()

    this.subscriptions.push(() => {
      this.interceptor.dispose()
    })

    // Assert that the interceptor has been applied successfully.
    // Also guards us from forgetting to call "interceptor.apply()"
    // as a part of the "listen" method.
    invariant(
      [InterceptorReadyState.APPLYING, InterceptorReadyState.APPLIED].includes(
        this.interceptor.readyState,
      ),
      devUtils.formatMessage(
        'Failed to start "setupServer": the interceptor failed to apply. This is likely an issue with the library and you should report it at "%s".',
      ),
      'https://github.com/mswjs/msw/issues/new/choose',
    )
  }

  public close(): void {
    this.dispose()
  }

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
    const events = await this.context.nodeEvents

    /**
     * @note React Native doesn't support "node:events".
     */
    if (typeof events === 'undefined') {
      return
    }

    const { setMaxListeners, defaultMaxListeners } = events

    if (typeof setMaxListeners !== 'function') {
      return
    }

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
}
