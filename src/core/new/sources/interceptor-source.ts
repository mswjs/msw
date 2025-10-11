import {
  BatchInterceptor,
  Interceptor,
  HttpRequestEventMap,
  RequestController,
} from '@mswjs/interceptors'
import type {
  WebSocketConnectionData,
  WebSocketEventMap,
} from '@mswjs/interceptors/WebSocket'
import { NetworkSource } from './index'
import { HttpNetworkFrame } from '../frames/http-frame'
import { WebSocketNetworkFrame } from '../frames/websocket-frame'
import { deleteRequestPassthroughHeader } from '../../utils/internal/requestUtils'
import { InternalError } from '../../utils/internal/devUtils'

interface InterceptorSourceOptions {
  interceptors: Array<Interceptor<HttpRequestEventMap | WebSocketEventMap>>
}

/**
 * Create a network source from the given interceptors.
 */
export class InterceptorSource extends NetworkSource {
  #interceptor: BatchInterceptor<
    Array<Interceptor<HttpRequestEventMap | WebSocketEventMap>>,
    HttpRequestEventMap | WebSocketEventMap
  >
  #httpFrames: Map<string, HttpNetworkFrame>

  constructor(options: InterceptorSourceOptions) {
    super()

    this.#interceptor = new BatchInterceptor({
      name: 'interceptor-source',
      interceptors: options.interceptors,
    })
    this.#httpFrames = new Map()
  }

  public async enable(): Promise<void> {
    this.#interceptor.apply()

    /**
     * @fixme Incorrect disciminated union when merging multiple
     * events map in `BatchInterceptor` (results in `Listener<unknown>`).
     */
    this.#interceptor.on('request', this.#onRequest.bind(this) as any)
    this.#interceptor.on('response', this.#onResponse.bind(this) as any)

    this.#interceptor.on(
      'connection',
      this.#onWebSocketConnection.bind(this) as any,
    )
  }

  public async disable(): Promise<void> {
    await super.disable()
    this.#httpFrames.clear()
    this.#interceptor.dispose()
  }

  async #onRequest({
    requestId,
    request,
    controller,
  }: HttpRequestEventMap['request'][0]) {
    const httpFrame = new InterceptorHttpNetworkFrame({
      id: requestId,
      request,
      controller,
    })

    this.#httpFrames.set(requestId, httpFrame)

    httpFrame.events.on('unhandledException', ({ error }) => {
      // Throw the errors intended for the developer as-is.
      // Those must not be coerced into 500 responses.
      if (error instanceof InternalError) {
        throw error
      }
    })

    await this.push(httpFrame)
  }

  #onResponse({
    requestId,
    request,
    response,
    isMockedResponse,
  }: HttpRequestEventMap['response'][0]): void {
    const httpFrame = this.#httpFrames.get(requestId)
    this.#httpFrames.delete(requestId)

    if (!httpFrame) {
      return
    }

    httpFrame.events.emit(
      isMockedResponse ? 'response:mocked' : 'response:bypass',
      {
        requestId,
        request,
        response,
      },
    )
  }

  async #onWebSocketConnection(connection: WebSocketEventMap['connection'][0]) {
    const webSocketFrame = new InterceptorWebSocketNetworkFrame({
      connection,
    })

    await this.push(webSocketFrame)
  }
}

class InterceptorHttpNetworkFrame extends HttpNetworkFrame {
  #controller: RequestController

  constructor(args: {
    id: string
    request: Request
    controller: RequestController
  }) {
    super({
      id: args.id,
      request: args.request,
    })

    this.#controller = args.controller
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
      throw reason
    }

    this.#controller.errorWith(reason as any)
  }

  public passthrough(): void {
    deleteRequestPassthroughHeader(this.data.request)
    return
  }
}

class InterceptorWebSocketNetworkFrame extends WebSocketNetworkFrame {
  constructor(args: { connection: WebSocketConnectionData }) {
    super({
      connection: args.connection,
    })
  }

  public passthrough() {
    this.data.connection.server.connect()
  }
}
