import { TypedEvent } from 'rettime'
import {
  BatchInterceptor,
  Interceptor,
  RequestController,
  type HttpRequestEventMap,
} from '@mswjs/interceptors'
import type {
  WebSocketConnectionData,
  WebSocketEventMap,
} from '@mswjs/interceptors/WebSocket'
import { NetworkSource } from './network-source'
import { InternalError } from '~/core/utils/internal/devUtils'
import { HttpNetworkFrame } from '../frames/http-frame'
import { WebSocketNetworkFrame } from '../frames/websocket-frame'
import { deleteRequestPassthroughHeader } from '../request-utils'

export interface InterceptorSourceOptions {
  interceptors: Array<Interceptor<HttpRequestEventMap | WebSocketEventMap>>
}

/**
 * Create a network source from the given list of interceptors.
 */
export class InterceptorSource extends NetworkSource<
  HttpNetworkFrame | WebSocketNetworkFrame
> {
  #interceptor: BatchInterceptor<
    InterceptorSourceOptions['interceptors'],
    HttpRequestEventMap | WebSocketEventMap
  >

  #frames: Map<string, HttpNetworkFrame>

  constructor(options: InterceptorSourceOptions) {
    super()

    this.#interceptor = new BatchInterceptor({
      name: 'interceptor-source',
      interceptors: options.interceptors,
    })
    this.#frames = new Map()
  }

  public async enable(): Promise<void> {
    this.#interceptor.apply()

    this.#interceptor
      .on('request', this.#handleRequest.bind(this))
      .on('response', this.#handleResponse.bind(this))
      .on('connection', this.#handleWebSocketConnection.bind(this))
  }

  public async disable(): Promise<void> {
    await super.disable()
    this.#interceptor.dispose()

    /**
     * @todo We can also abort any pending frames here, given we implement
     * the `NetworkFrame.abort()` method.
     */
    this.#frames.clear()
  }

  async #handleRequest({
    requestId,
    request,
    controller,
  }: HttpRequestEventMap['request'][0]): Promise<void> {
    const httpFrame = new InterceptorHttpNetworkFrame({
      id: requestId,
      request,
      controller,
    })

    this.#frames.set(requestId, httpFrame)
    await this.queue(httpFrame)
  }

  async #handleResponse({
    requestId,
    request,
    response,
    isMockedResponse,
  }: HttpRequestEventMap['response'][0]): Promise<void> {
    const httpFrame = this.#frames.get(requestId)
    this.#frames.delete(requestId)

    if (httpFrame == null) {
      return
    }

    httpFrame.events.emit(
      new TypedEvent('response', {
        data: {
          requestId,
          request,
          response,
          isMockedResponse,
        },
      }),
    )
  }

  async #handleWebSocketConnection(
    connection: WebSocketEventMap['connection'][0],
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
  constructor(args: { connection: WebSocketConnectionData }) {
    super({ connection: args.connection })
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Error) {
      const { client } = this.data.connection

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

      client.socket.dispatchEvent(errorEvent)
    }
  }

  public passthrough() {
    this.data.connection.server.connect()
  }
}
