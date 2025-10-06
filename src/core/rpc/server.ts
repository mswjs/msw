import * as http from 'node:http'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io-client'
import type {
  NetworkSessionEventMap,
  RpcServerEventMap,
  StreamEventMap,
} from './events'
import {
  deserializeHttpRequest,
  serializeHttpResponse,
} from './packets/http-packet'
import { emitReadableStream } from './utils'

export class RpcServer {
  #server: Server<NetworkSessionEventMap, RpcServerEventMap>

  constructor() {
    const httpServer = http.createServer()

    this.#server = new Server()
    this.#server.attach(httpServer)

    this.#server.on('connection', (client) => {
      client.on('request', (serializedRequest) => {
        const request = deserializeHttpRequest(
          serializedRequest,
          client as unknown as Socket<any, StreamEventMap>,
        )

        /** @todo Notify the consumer there's been a request! */
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
}
