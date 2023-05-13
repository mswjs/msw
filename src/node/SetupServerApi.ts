import { invariant } from 'outvariant'
import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
} from '@mswjs/interceptors'

import { io, Socket } from 'socket.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { rest } from '~/core'

import { SetupApi } from '~/core/SetupApi'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '~/core/sharedOptions'
import { RequiredDeep } from '~/core/typeUtils'
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { handleRequest } from '~/core/utils/handleRequest'
import { devUtils } from '~/core/utils/internal/devUtils'
import { SetupServer } from './glossary'
import {
  deserializeResponse,
  SerializedResponse,
  serializeRequest,
} from '~/core/utils/request/serializeUtils'

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

    this.syncServerPromise = this.connectToSyncServer()

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
          rest.all('*', async ({ request }) => {
            /**
             * @note Bypass the socket.io HTTP handshake
             * so the sync WS server connection doesn't hang forever.
             * Check this as the first thing to unblock the handling.
             *
             * @todo Rely on the internal request header instead so
             * we don't interfere if the user is using socket.io.
             */
            if (request.url.includes('socket.io')) {
              return
            }

            const syncServer = await this.syncServerPromise

            // If the sync server hasn't been started or failed to connect,
            // skip this request handler altogether, it has no effect.
            if (syncServer == null) {
              console.log('[server] no sync ws open, skipping...')
              return
            }

            syncServer.emit(
              'request',
              await serializeRequest(request),
              requestId,
            )

            const responsePromise = new DeferredPromise<Response | undefined>()

            /**
             * @todo Handle timeouts.
             * @todo Handle socket errors.
             */
            syncServer.on(
              'response',
              (serializedResponse: SerializedResponse) => {
                console.log('[server] response from WS:', serializedResponse)

                responsePromise.resolve(
                  serializedResponse
                    ? deserializeResponse(serializedResponse)
                    : undefined,
                )
              },
            )

            return await responsePromise
          }),
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

  private syncServerPromise: Promise<Socket | null>

  private async connectToSyncServer(): Promise<Socket | null> {
    const connectionPromise = new DeferredPromise<Socket | null>()
    const socket = io('http://localhost:50222')

    console.log('[server] connecting to the sync server...')

    socket.on('connect', () => {
      console.log('>>> `[server] CONNECTED TO THE SYNC SERVER!')
      connectionPromise.resolve(socket)
    })

    socket.io.on('error', (error) => {
      console.error('[server] sync server connection error:', error.message)
      connectionPromise.resolve(null)
    })

    return connectionPromise
  }
}
