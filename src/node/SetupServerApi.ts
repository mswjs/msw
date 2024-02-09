import {
  BatchInterceptor,
  HttpRequestEventMap,
  Interceptor,
  InterceptorReadyState,
} from '@mswjs/interceptors'
import { type Socket } from 'socket.io-client'
import { invariant } from 'outvariant'
import { SetupApi } from '~/core/SetupApi'
import { RequestHandler } from '~/core/handlers/RequestHandler'
import { LifeCycleEventsMap, SharedOptions } from '~/core/sharedOptions'
import { RequiredDeep } from '~/core/typeUtils'
import { handleRequest } from '~/core/utils/handleRequest'
import { devUtils } from '~/core/utils/internal/devUtils'
import { ListenOptions, SetupServer } from './glossary'
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
import { mergeRight } from '~/core/utils/internal/mergeRight'
import { Emitter } from 'strict-event-emitter'

const DEFAULT_LISTEN_OPTIONS: RequiredDeep<SharedOptions> = {
  onUnhandledRequest: 'warn',
}

export type InterceptorsList = Array<{
  new (): Interceptor<HttpRequestEventMap>
}>

interface InteractiveRequest extends Request {
  respondWith(response: Response): void
}

export class SetupServerApi
  extends SetupApi<LifeCycleEventsMap>
  implements SetupServer
{
  protected readonly interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap>>,
    HttpRequestEventMap
  >
  private resolvedOptions: RequiredDeep<ListenOptions>
  private socket: Socket<SyncServerEventsMap> | undefined

  constructor(
    interceptors: InterceptorsList,
    ...handlers: Array<RequestHandler>
  ) {
    super(...handlers)

    this.interceptor = new BatchInterceptor({
      name: 'setup-server',
      interceptors: interceptors.map((Interceptor) => new Interceptor()),
    })
    this.resolvedOptions = {} as RequiredDeep<ListenOptions>

    this.init()
  }

  /**
   * Subscribe to all requests that are using the interceptor object
   */
  private init(): void {
    this.interceptor.on('request', async ({ request, requestId }) => {
      // If in remote mode, await the WebSocket connection promise
      // before handling any requests.
      if (this.resolvedOptions.remotePort) {
        const remoteResolutionUrl = createWebSocketServerUrl(
          this.resolvedOptions.remotePort,
        )
        // Build a pattern to match the socket.io connection
        remoteResolutionUrl.pathname = '/socket.io'
        const matcher = new RegExp(`${remoteResolutionUrl.href}/.*`)
        const isRequestForSocket = matcher.test(request.url)
        // Bypass handling if the request is for the socket.io connection
        if (isRequestForSocket) {
          return this.applyRequestHandling(
            request,
            requestId,
            this.currentHandlers,
            this.resolvedOptions,
            this.emitter,
          )
        }

        if (typeof this.socket === 'undefined') {
          this.socket = await createSyncClient(this.resolvedOptions.remotePort)
        }

        if (typeof this.socket !== 'undefined') {
          this.currentHandlers = [
            new RemoteRequestHandler({
              requestId,
              socket: this.socket,
            }),
            ...this.currentHandlers,
          ]
        }
      }

      return this.applyRequestHandling(
        request,
        requestId,
        this.currentHandlers,
        this.resolvedOptions,
        this.emitter,
      )
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

  private async applyRequestHandling(
    request: InteractiveRequest,
    requestId: string,
    handlers: Array<RequestHandler>,
    options: RequiredDeep<SharedOptions>,
    emitter: Emitter<LifeCycleEventsMap>,
  ) {
    const response = await handleRequest(
      request,
      requestId,
      handlers,
      options,
      emitter,
    )

    if (response) {
      request.respondWith(response)
    }
    return
  }

  public listen(options: Partial<ListenOptions> = {}): void {
    this.resolvedOptions = mergeRight(
      DEFAULT_LISTEN_OPTIONS,
      options,
    ) as RequiredDeep<ListenOptions>

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
