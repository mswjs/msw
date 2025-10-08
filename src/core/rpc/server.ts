import * as http from 'node:http'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io-client'
import { Emitter, TypedEvent } from 'rettime'
import type { NetworkSessionEventMap, StreamEventMap } from './events'
import {
  deserializeHttpRequest,
  serializeHttpResponse,
} from './packets/http-packet'
import { emitReadableStream } from './utils'

type RpcServerPublicEventMap = {
  request: TypedEvent<{ request: Request }, Response>
}

export class RpcServer extends Emitter<RpcServerPublicEventMap> {
  #server: Server<NetworkSessionEventMap, RpcServerPublicEventMap>

  constructor() {
    super()

    const httpServer = http.createServer()

    this.#server = new Server()
    this.#server.attach(httpServer)

    this.#server.on('connection', (client) => {
      client.on('request', async (serializedRequest) => {
        const request = deserializeHttpRequest(
          serializedRequest,
          client as unknown as Socket<any, StreamEventMap>,
        )

        /** @todo Notify the consumer there's been a request! */
        const results = await this.emitAsPromise(
          new TypedEvent('request', {
            data: {
              request,
            },
          }),
        )

        const response = new Response('hello world')

        client.emit('response', serializeHttpResponse(response))

        if (response.body != null) {
          emitReadableStream(
            response.body,
            client as unknown as Socket<any, StreamEventMap>,
          )
        }
      })
    })
  }

  public async listen(port: number): Promise<void> {
    const listenPromise = new DeferredPromise<void>()
    const { httpServer } = this.#server

    httpServer
      .listen(port, () => listenPromise.resolve())
      .once('error', (error) => listenPromise.reject(error))

    return listenPromise
  }

  public async close(): Promise<void> {
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
