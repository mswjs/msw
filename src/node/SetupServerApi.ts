import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
} from '@mswjs/interceptors'
import { io, Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { SetupApi } from '~/core/SetupApi'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '~/core/sharedOptions'
import { RequiredDeep } from '~/core/typeUtils'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { handleRequest } from '~/core/utils/handleRequest'
import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupServer } from './glossary'
import {
  SYNC_SERVER_URL,
  SyncServerEventsMap,
  createRemoteServerResolver,
} from './setupRemoteServer'

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export type InterceptorsList = Array<{
  new (): Interceptor<HttpRequestEventMap>
}>

export class SetupServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServer
{
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  private resolvedOptions: RequiredDeep<SharedOptions>
  private syncSocketPromise: Promise<Socket<SyncServerEventsMap> | undefined>

  constructor(
    interceptors: InterceptorsList,
    ...handlers: Array<RequestHandler>
  ) {
    super(...handlers)

    this.interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })
    this.resolvedOptions = {} as RequiredDeep<SharedOptions>

    this.syncSocketPromise = Promise.resolve(undefined)

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
        [
          createRemoteServerResolver({
            requestId,
            socketPromise: this.syncSocketPromise,
          }),
          /**
           * @todo Spreading the list of all request handlers can be costly.
           * Consider finding another way of always running the sync server resolver
           * first.
           */
          ...this.currentHandlers,
        ],
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

    this.syncSocketPromise = this.createSyncServerConnection()

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

  public printHandlers(): void {
    const handlers = this.listHandlers()

    handlers.forEach((handler) => {
      const { header, callFrame } = handler.info

      const pragma = handler.info.hasOwnProperty('operationType')
        ? '[graphql]'
        : '[rest]'

      console.log(`\
${`${pragma} ${header}`}
  Declaration: ${callFrame}
`)
    })
  }

  public close(): void {
    this.dispose()
  }

  private async createSyncServerConnection(): Promise<Socket | undefined> {
    const connectionPromise = new DeferredPromise<
      Socket<SyncServerEventsMap> | undefined
    >()
    const socket = io(SYNC_SERVER_URL.href, {
      timeout: 200,
      reconnection: false,
      extraHeaders: {
        'x-msw-request-type': 'internal-request',
      },
    })

    socket.on('connect', () => {
      connectionPromise.resolve(socket)
    })

    socket.io.on('error', () => {
      connectionPromise.resolve(undefined)
    })

    return connectionPromise
  }
}
