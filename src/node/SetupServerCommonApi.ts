/**
 * @note This API is extended by both "msw/node" and "msw/native"
 * so be minding about the things you import!
 */
import type { RequiredDeep } from 'type-fest'
import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  InterceptorReadyState,
  type HttpRequestEventMap,
  type Interceptor,
} from '@mswjs/interceptors'
import type { LifeCycleEventsMap, SharedOptions } from '~/core/sharedOptions'
import { SetupApi } from '~/core/SetupApi'
import { handleRequest } from '~/core/utils/handleRequest'
import type { RequestHandler } from '~/core/handlers/RequestHandler'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { InternalError, devUtils } from '~/core/utils/internal/devUtils'
import type { SetupServerCommon } from './glossary'

export const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export class SetupServerCommonApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServerCommon
{
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  private resolvedOptions: RequiredDeep<SharedOptions>

  constructor(
    interceptors: Array<{ new (): Interceptor<HttpRequestEventMap> }>,
    handlers: Array<RequestHandler>,
  ) {
    super(...handlers)

    this.interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })

    this.resolvedOptions = {} as RequiredDeep<SharedOptions>

    this.init()
  }

  /**
   * Subscribe to all requests that are using the interceptor object
   */
  private init(): void {
    this.interceptor.on('request', async ({ request, requestId }) => {
      const response = await handleRequest(
        request,
        requestId,
        this.handlersController.currentHandlers(),
        this.resolvedOptions,
        this.emitter,
      )

      if (response) {
        request.respondWith(response)
      }

      return
    })

    this.interceptor.on('unhandledException', ({ error }) => {
      if (error instanceof InternalError) {
        throw error
      }
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
}
