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
      console.log(
        '[server] interceptor "request" event:',
        request.method,
        request.url,
      )

      const response = await handleRequest(
        request,
        requestId,
        [
          /**
           * Try to resolve the request from the sync WebSocket server.
           */
          rest.all('*', async ({ request }) => {
            console.log(
              '[server] [handleRequest] rest.all("*")',
              request.method,
              request.url,
            )

            /**
             * @note Bypass the socket.io HTTP handshake
             * so the WS connection doesn't hang forever.
             */
            if (request.url.includes('socket.io')) {
              return
            }

            const syncServer = await this.syncServerPromise
            console.log(
              '\n\n [server] awaited sync server promise:',
              typeof syncServer,
            )

            console.log('[server] fixed handler:', request.method, request.url)

            if (syncServer == null) {
              console.log('[server] no sync ws open, skipping...')
              return
            }

            console.log('[server] ws:', syncServer.connected)

            console.log('[server] sync ws is open! emitting "request"...')
            syncServer.emit(
              'request',
              {
                method: request.method,
                url: request.url,
                // headers: Object.fromEntries(request.headers.entries()),
                body: ['HEAD', 'GET'].includes(request.method)
                  ? undefined
                  : await request.clone().arrayBuffer(),
              },
              requestId,
            )

            return new Promise<Response | void>((resolve) => {
              syncServer.on('response', (responseInit: Record<string, any>) => {
                console.log('[server] response from WS:', responseInit)

                if (!responseInit) {
                  return resolve()
                }

                const response = new Response(responseInit.body, responseInit)
                resolve(response)
              })
            })
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
