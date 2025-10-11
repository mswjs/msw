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

  constructor(options: InterceptorSourceOptions) {
    super()

    this.#interceptor = new BatchInterceptor({
      name: 'interceptor-source',
      interceptors: options.interceptors,
    })
  }

  public async enable(): Promise<void> {
    this.#interceptor.apply()

    /**
     * @fixme Incorrect disciminated union when merging multiple
     * events map in `BatchInterceptor` (results in `Listener<unknown>`).
     */
    this.#interceptor.on('request', this.#onRequest.bind(this) as any)
    this.#interceptor.on(
      'connection',
      this.#onWebSocketConnection.bind(this) as any,
    )
  }

  public async disable(): Promise<void> {
    await super.disable()
    this.#interceptor.dispose()
  }

  async #onRequest({ request, controller }: HttpRequestEventMap['request'][0]) {
    const httpFrame = new InterceptorHttpNetworkFrame({
      request,
      controller,
    })

    await this.push(httpFrame)
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

  constructor(args: { request: Request; controller: RequestController }) {
    super({
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
