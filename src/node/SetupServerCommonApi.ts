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
import { devUtils } from '~/core/utils/internal/devUtils'
import type { ListenOptions, SetupServerCommon } from './glossary'
import type { Socket } from 'socket.io-client'
import {
  SyncServerEventsMap,
  createSyncClient,
  createWebSocketServerUrl,
} from './setupRemoteServer'
import {
  onAnyEvent,
  serializeEventPayload,
} from '~/core/utils/internal/emitterUtils'
import { RemoteRequestHandler } from '~/core/handlers/RemoteRequestHandler'
import { http, passthrough } from '~/core'

export const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

interface InteractiveRequest extends Request {
  respondWith(response: Response): void
}

export class SetupServerCommonApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServerCommon
{
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  private resolvedOptions: RequiredDeep<ListenOptions>
  private socket: Socket<SyncServerEventsMap> | undefined

  constructor(
    interceptors: Array<{ new (): Interceptor<HttpRequestEventMap> }>,
    handlers: Array<RequestHandler>,
  ) {
    super(...handlers)

    this.interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })

    this.resolvedOptions = {} as RequiredDeep<ListenOptions>

    this.init()
  }

  private isRequestForSocket(requestUrl: string, remotePort: number): boolean {
    const remoteResolutionUrl = createWebSocketServerUrl(remotePort)
    // Build a pattern to match the socket.io connection
    remoteResolutionUrl.pathname = '/socket.io'
    const matcher = new RegExp(`${remoteResolutionUrl.href}/.*`)
    return matcher.test(requestUrl)
  }

  /**
   * Subscribe to all requests that are using the interceptor object
   */
  private init(): void {
    this.interceptor.on('request', async ({ request, requestId }) => {
      // If in remote mode, await the WebSocket connection promise
      // before handling any requests.
      if (this.resolvedOptions.remotePort) {
        // Bypass handling if the request is for the socket.io connection
        const isSocketRequest = this.isRequestForSocket(
          request.url,
          this.resolvedOptions.remotePort,
        )
        if (isSocketRequest) {
          // if (typeof this.socket === 'undefined') {
          console.log(
            'Skipping request for socket.io connection',
            request.method,
            request.url,
            requestId,
          )
          return
          // }
        } else {
          console.log({
            message: 'Request intercepted in CommonApi',
            handlers: this.handlersController.currentHandlers(),
            url: request.url,
            method: request.method,
            requestId,
          })
        }
        //   } else {
        //     console.log(
        //       'Socket exists, handling request for socket.io connection',
        //     )
        //     // const r = await handleRequest(
        //     //   request,
        //     //   requestId,
        //     //   this.handlersController.currentHandlers(),
        //     //   this.resolvedOptions,
        //     //   this.emitter,
        //     // )
        //     // console.log({
        //     //   r,
        //     //   m: 'Got response socket.io handling in CommonApi',
        //     // })

        //     // return
        //   }
        // }

        if (typeof this.socket === 'undefined') {
          console.log('Creating client socket')
          this.socket = await createSyncClient(this.resolvedOptions.remotePort)
          console.log({ socket: this.socket, m: 'Created client socket' })
        }

        // if (typeof this.socket !== 'undefined' && !isSocketRequest) {
        if (typeof this.socket !== 'undefined') {
          console.log('Adding handlers, first load? ReqId: ', requestId)
          const initialHandlers = this.handlersController.currentHandlers()
          this.handlersController.prepend([
            http.all(
              'http://localhost:3030/socket.io',
              ({ request, requestId }) => {
                console.log({
                  msg: 'Passing through socket.io request',
                  url: request.url,
                  method: request.method,
                  requestId,
                })
                return passthrough()
              },
            ),
            new RemoteRequestHandler({
              requestId,
              socket: this.socket,
            }),
          ])
          this.socket.on('disconnect', () => {
            console.log('Remote handler disconnected')
            this.handlersController.reset(initialHandlers)
            this.socket = undefined
            console.log({ handlers: this.handlersController.currentHandlers() })
          })
        }
      }

      console.log({
        msg: `Handling request for ${request.url}`,
        requestId,
        requestHeaders: Array.from(request.headers.entries()),
        handlers: this.handlersController.currentHandlers(),
      })
      const response = await handleRequest(
        request,
        requestId,
        this.handlersController.currentHandlers(),
        this.resolvedOptions,
        this.emitter,
      )
      console.log({
        response,
        m: 'Got response in CommonApi',
        requestId,
        url: request.url,
      })

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

  public listen(options: Partial<ListenOptions> = {}): void {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<ListenOptions>

    this.handlersController.prepend([
      http.all('http://localhost:3030/socket.io', ({ request, requestId }) => {
        console.log({
          msg: 'Passing through socket.io request',
          url: request.url,
          method: request.method,
          requestId,
        })
        return passthrough()
      }),
    ])

    // Once the connection to the remote WebSocket server succeeds,
    // pipe any life-cycle events from this process through that socket.
    onAnyEvent(this.emitter, async (eventName, listenerArgs) => {
      const { socket } = this

      if (typeof socket === 'undefined') {
        return
      }

      const forwardLifeCycleEvent = async () => {
        const args = await serializeEventPayload(listenerArgs)
        socket.emit(
          'lifeCycleEventForward',
          /**
           * @todo Annotating serialized/desirialized mirror channels is tough.
           */
          eventName,
          args as any,
        )
      }

      switch (eventName) {
        case 'request:start':
        case 'request:match':
        case 'request:unhandled':
        case 'request:end': {
          const { request } = listenerArgs

          if (
            request.headers.get('x-msw-request-type') === 'internal-request'
          ) {
            return
          }

          forwardLifeCycleEvent()
          break
        }

        case 'response:bypass':
        case 'response:mocked': {
          const { request } = listenerArgs

          if (
            request.headers.get('x-msw-request-type') === 'internal-request'
          ) {
            return
          }

          forwardLifeCycleEvent()
          break
        }
      }
    })

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
