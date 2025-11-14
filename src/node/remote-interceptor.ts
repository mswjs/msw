import * as http from 'node:http'
import type { WebSocketEventMap } from '@mswjs/interceptors/WebSocket'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { Server as WebSocketServer } from 'socket.io'
import {
  createRequestId,
  Interceptor,
  RequestController,
  type HttpRequestEventMap,
} from '@mswjs/interceptors'
import { deserializeHttpRequest } from '~/core/rpc/packets/http-packet'

interface RemoteInterceptorOptions {
  port: number
}

export class RemoteInterceptor extends Interceptor<
  HttpRequestEventMap | WebSocketEventMap
> {
  static symbol = Symbol.for('remote-interceptor')

  #httpServer: http.Server
  #server: WebSocketServer

  constructor(protected options: RemoteInterceptorOptions) {
    super(RemoteInterceptor.symbol)

    this.#httpServer = http.createServer()
    this.#server = new WebSocketServer()
    this.#server.attachApp(this.#httpServer)

    this.#server.on('connection', (socket) => {
      socket.on('http', async (serializedRequest) => {
        const requestId = createRequestId()
        const request = deserializeHttpRequest(serializedRequest, socket)
        /**
         * @todo Would be nice if `RequestController` allowed implementing
         * your own `.respondWith()` and `.errorWith()` kind of like
         * `ReadableStreamUnderlyingSource`.
         */
        const controller = new RequestController(request)

        /** @todo emit as promise and handle the result? */
        // - asyncEmit isn't public
        // - would be nice to use `rettime` in Interceptors.
        this.emitter.emit('request', {
          request,
          requestId,
          controller,
        })
      })

      /** @todo socket.on('websocket') */
      // this.emitter.emit('connection', connection)
    })
  }

  protected async setup(): Promise<void> {
    const listenPromise = new DeferredPromise<void>()

    this.#httpServer
      .listen(this.options.port, () => listenPromise.resolve())
      .once('error', (error) => listenPromise.reject(error))

    return listenPromise
  }

  async dispose(): Promise<void> {
    super.dispose()

    const closePromise = new DeferredPromise<void>()

    this.#server.close((error) => {
      if (error) {
        closePromise.reject(error)
      } else {
        closePromise.resolve()
      }
    })

    await closePromise
  }
}
