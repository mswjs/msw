import * as http from 'node:http'
import { Server as WebSocketServer } from 'socket.io'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { HttpNetworkFrame, NetworkSource } from '#core/experimental'

interface RemoteProcessNetworkSourceOptions {
  port: number
}

export class RemoteProcessNetworkSource extends NetworkSource {
  #port: number
  #httpServer: http.Server
  #wsServer: WebSocketServer

  constructor(options: RemoteProcessNetworkSourceOptions) {
    super()

    this.#port = options.port
    this.#httpServer = http.createServer()
    this.#wsServer = new WebSocketServer()
    this.#wsServer.attachApp(this.#httpServer)
  }

  public async enable(): Promise<void> {
    this.#wsServer.on('connection', (socket) => {
      socket
        .on('http', async (serializedRequest) => {
          const httpFrame = new RemoteHttpNetworkFrame({
            request: new Request(),
          })

          await this.queue(httpFrame)
        })
        .on('websocket', async () => {
          /** @todo Support WebSocket connections */
        })
    })

    const listenPromise = new DeferredPromise<void>()

    this.#httpServer
      .listen(this.#port, () => listenPromise.resolve())
      .once('error', (error) => listenPromise.reject(error))

    return listenPromise
  }

  public disable(): Promise<void> {
    this.#wsServer.removeAllListeners()
    this.#wsServer.disconnectSockets()

    const closePromise = new DeferredPromise<void>()

    this.#wsServer.close((error) => {
      if (error) {
        return closePromise.reject(error)
      }

      closePromise.resolve()
    })

    return closePromise
  }
}

class RemoteHttpNetworkFrame extends HttpNetworkFrame {
  constructor(options: { request: Request }) {
    super({ request: options.request })
  }
}
