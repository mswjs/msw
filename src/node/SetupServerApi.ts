import chalk from 'chalk'
import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
  IsomorphicResponse,
  MockedResponse as MockedInterceptedResponse,
} from '@mswjs/interceptors'
import { SetupApi } from '../SetupApi'
import { RequestHandler } from '../handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '../sharedOptions'
import { RequiredDeep } from '../typeUtils'
import { mergeRight } from '../utils/internal/mergeRight'
import { MockedRequest } from '../utils/request/MockedRequest'
import { handleRequest } from '../utils/handleRequest'
import { devUtils } from '../utils/internal/devUtils'

/**
 * @see https://github.com/mswjs/msw/pull/1399
 */
const { bold } = chalk

export type ServerLifecycleEventsMap = LifeCycleEventsMap<IsomorphicResponse>

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export class SetupServerApi extends SetupApi<ServerLifecycleEventsMap> {
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
    this.interceptor.on('request', async (request) => {
      const mockedRequest = new MockedRequest(request.url, {
        ...request,
        body: await request.arrayBuffer(),
      })

      const response = await handleRequest<
        MockedInterceptedResponse & { delay?: number }
      >(
        mockedRequest,
        this.currentHandlers,
        this.resolvedOptions,
        this.emitter,
        {
          transformResponse(response) {
            return {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers.all(),
              body: response.body,
              delay: response.delay,
            }
          },
        },
      )

      if (response) {
        // Delay Node.js responses in the listener so that
        // the response lookup logic is not concerned with responding
        // in any way. The same delay is implemented in the worker.
        if (response.delay) {
          await new Promise((resolve) => {
            setTimeout(resolve, response.delay)
          })
        }

        request.respondWith(response)
      }

      return
    })

    this.interceptor.on('response', (request, response) => {
      if (!request.id) {
        return
      }

      if (response.headers.get('x-powered-by') === 'msw') {
        this.emitter.emit('response:mocked', response, request.id)
      } else {
        this.emitter.emit('response:bypass', response, request.id)
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
