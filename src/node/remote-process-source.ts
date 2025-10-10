import * as http from 'node:http'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { Socket, Server as WebSocketServer } from 'socket.io'
import { NetworkSource } from '~/core/new/sources/index'
import { HttpNetworkFrame } from '~/core/new/frames/http-frame'
import {
  deserializeHttpRequest,
  serializeHttpResponse,
} from '~/core/rpc/packets/http-packet'
import { emitReadableStream } from '~/core/rpc/utils'
import { HttpResponse } from '~/core/HttpResponse'

export class RemoteProcessSource extends NetworkSource {
  #httpServer: http.Server
  #server: WebSocketServer

  constructor(private readonly options: { port: number }) {
    super()

    this.#httpServer = http.createServer()
    this.#server = new WebSocketServer()
    this.#server.attach(this.#httpServer)

    this.#server.on('connection', (client) => {
      client.on('request', async (serializedRequest) => {
        const request = deserializeHttpRequest(serializedRequest, client)
        const httpFrame = new RemoteProcessHttpNetworkFrame({
          request,
          socket: client,
        })

        await this.push(httpFrame)
      })

      client.on('websocket', () => {
        /** @todo */
      })
    })
  }

  public async enable(): Promise<void> {
    const listenPromise = new DeferredPromise<void>()

    this.#httpServer
      .listen(this.options.port, () => listenPromise.resolve())
      .once('error', (error) => listenPromise.reject(error))

    return listenPromise
  }

  public async disable(): Promise<void> {
    const closePromise = new DeferredPromise<void>()

    this.#server.disconnectSockets()
    this.#server.close((error) => {
      if (error) {
        closePromise.reject(error)
      } else {
        closePromise.resolve()
      }
    })

    return closePromise
  }
}

class RemoteProcessHttpNetworkFrame extends HttpNetworkFrame {
  #socket: Socket

  constructor(args: { request: Request; socket: Socket }) {
    super({
      request: args.request,
    })

    this.#socket = args.socket
  }

  public respondWith(response?: Response): void {
    if (response) {
      this.#respondWith(response)
    }
  }

  public errorWith(reason?: unknown): void {
    if (reason instanceof Response) {
      return this.respondWith(reason)
    }

    if (reason instanceof Error) {
      this.respondWith(
        HttpResponse.json(
          {
            name: reason.name,
            message: reason.message,
            stack: reason.stack,
          },
          {
            status: 500,
            statusText: 'Request Handler Error',
          },
        ),
      )
    }
  }

  public passthrough(): void {
    this.#socket.emit('response', undefined)
  }

  #respondWith(response: Response): void {
    this.#socket.emit('response', serializeHttpResponse(response))

    if (response.body != null) {
      emitReadableStream(response.body, this.#socket)
    }
  }
}
