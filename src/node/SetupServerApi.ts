import chalk from 'chalk'
import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
} from '@mswjs/interceptors'
import { SetupApi } from '../SetupApi'
import { RequestHandler } from '../handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { mergeRight } from '../utils/internal/mergeRight'
import { handleRequest } from '../utils/handleRequest'
import { devUtils } from '../utils/internal/devUtils'
import { SetupServer } from './glossary'

/**
 * @see https://github.com/mswjs/msw/pull/1399
 */
const { bold } = chalk

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export class SetupServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServer
{
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
    this.interceptor.on('request', async (request, requestId) => {
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

    this.interceptor.on('response', (response, request, requestId) => {
      if (response.headers.get('x-powered-by') === 'msw') {
        this.emitter.emit('response:mocked', response, request, requestId)
      } else {
        this.emitter.emit('response:bypass', response, request, requestId)
      }
    })
  }

  public listen(options: Partial<SharedOptions> = {}): void {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<SharedOptions>

    // Apply the interceptor when starting the server.
    this.interceptor.apply()

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

  public printHandlers(): void {
    const handlers = this.listHandlers()

    handlers.forEach((handler) => {
      const { header, callFrame } = handler.info

      const pragma = handler.info.hasOwnProperty('operationType')
        ? '[graphql]'
        : '[rest]'

      console.log(`\
${bold(`${pragma} ${header}`)}
  Declaration: ${callFrame}
`)
    })
  }

  public close(): void {
    super.dispose()
    this.interceptor.dispose()
  }
}
