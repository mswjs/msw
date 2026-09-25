import type { Interceptor, RequestController } from '@mswjs/interceptors'
import {
  BatchInterceptor,
  type HttpRequestEventMap,
  type HttpRequestEvent,
  type HttpResponseEvent,
} from '@mswjs/interceptors'
import type {
  WebSocketClientConnection,
  WebSocketInterceptedConnection,
  WebSocketEventMap,
} from '@mswjs/interceptors/WebSocket'
import { NetworkSource } from './network-source'
import { InternalError } from '../../utils/internal/dev-utils'
import { HttpNetworkFrame, ResponseEvent } from '../frames/http-frame'
import { WebSocketNetworkFrame } from '../frames/websocket-frame'
import { deleteRequestPassthroughHeader } from '../request-utils'

export interface InterceptorSourceOptions {
  interceptors: Array<Interceptor<HttpRequestEventMap | WebSocketEventMap>>
}

/**
 * Create a network source from the given list of interceptors.
 */
export class InterceptorSource extends NetworkSource {
  #interceptor: BatchInterceptor<
    InterceptorSourceOptions['interceptors'],
    HttpRequestEventMap & WebSocketEventMap
  >

  /**
   * @note Frames are keyed by the request instance, not the request ID.
   * The interceptor emits the same request instance on the "request"
   * and "response" events, so the frame can be looked up by identity.
   * A weak reference lets the frame be garbage collected alongside
   * its request once the request settles without producing a response
   * (e.g. a passthrough request failing with a network error).
   * @see https://github.com/mswjs/msw/issues/2792
   */
  #frames: WeakMap<Request, HttpNetworkFrame>

  constructor(options: InterceptorSourceOptions) {
    super()

    this.#interceptor = new BatchInterceptor({
      name: 'interceptor-source',
      interceptors: options.interceptors,
    })
    this.#frames = new WeakMap()
  }

  public enable(): void {
    this.#interceptor.apply()

    this.#interceptor
      .on('request', this.#handleRequest.bind(this))
      .on('response', this.#handleResponse.bind(this))
      .on('connection', this.#handleWebSocketConnection.bind(this))
  }

  public disable(): void {
    super.disable()
    this.#interceptor.dispose()

    /**
     * @todo We can also abort any pending frames here, given we implement
     * the `NetworkFrame.abort()` method.
     */
    this.#frames = new WeakMap()
  }

  async #handleRequest(event: HttpRequestEvent): Promise<void> {
    const { requestId, request, controller } = event
    const httpFrame = new InterceptorHttpNetworkFrame({
      id: requestId,
      request,
      controller,
    })

    this.#frames.set(request, httpFrame)
    await this.queue(httpFrame)
  }

  async #handleResponse({
    requestId,
    request,
    response,
    responseType,
  }: HttpResponseEvent): Promise<void> {
    const httpFrame = this.#frames.get(request)
    this.#frames.delete(request)

    if (httpFrame == null) {
      return
    }

    queueMicrotask(() => {
      try {
        httpFrame.events.emit(
          new ResponseEvent(
            responseType === 'mock' ? 'response:mocked' : 'response:bypass',
            {
              requestId,
              request,
              response,
            },
          ),
        )
      } finally {
        /**
         * @note Remove any listeners from this frame.
         * Past this point, it won't emit anything. The removal is crucial
         * to prevent "rettime" from keeping the abort cleanup listeners internally.
         * @see https://github.com/mswjs/msw/issues/2735
         */
        httpFrame.events.removeAllListeners()
      }
    })
  }

  async #handleWebSocketConnection(
    connection: WebSocketEventMap['connection'],
  ): Promise<void> {
    await this.queue(
      new InterceptorWebSocketNetworkFrame({
        connection,
      }),
    )
  }
}

class InterceptorHttpNetworkFrame extends HttpNetworkFrame {
  #controller: RequestController

  constructor(options: {
    id: string
    request: Request
    controller: RequestController
  }) {
    super({
      id: options.id,
      request: options.request,
    })

    this.#controller = options.controller
  }

  public passthrough(): void {
    deleteRequestPassthroughHeader(this.data.request)
  }

  public respondWith(response?: Response): void {
    if (response) {
      this.#controller.respondWith(response)
    }
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Response) {
      return this.respondWith(reason)
    }

    if (reason instanceof InternalError) {
      this.#controller.errorWith(reason)
    }

    throw reason
  }
}

class InterceptorWebSocketNetworkFrame extends WebSocketNetworkFrame {
  /**
   * The in-process client connection, whose socket
   * the frame dispatches errors on.
   */
  readonly #client: WebSocketClientConnection

  constructor(args: { connection: WebSocketInterceptedConnection }) {
    super({ connection: args.connection })

    this.#client = args.connection.client

    /**
     * @note Provide a similar frame listener cleanup as for HTTP.
     * When the client connection closes, the handler can no longer be used.
     */
    args.connection.client.addEventListener(
      'close',
      () => {
        this.events.removeAllListeners()
      },
      {
        once: true,
      },
    )
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Error) {
      /**
       * Use `client.errorWith(reason)` in the future.
       * @see https://github.com/mswjs/interceptors/issues/747
       */
      const errorEvent = new Event('error')

      Object.defineProperty(errorEvent, 'cause', {
        enumerable: true,
        configurable: false,
        value: reason,
      })

      this.#client.socket.dispatchEvent(errorEvent)
    }
  }

  public passthrough() {
    this.data.connection.server.connect()
  }
}
