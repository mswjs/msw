import { io } from 'socket.io-client'
import { WebSocket as WebSocketTransport } from 'engine.io-client'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { NetworkSource } from '#core/experimental/sources/network-source'
import { HttpNetworkFrame } from '#core/experimental/frames/http-frame'
import { type SessionSocket } from './session'
import { HttpPacket } from './packets/http-packet'

export class RemoteNetworkSource extends NetworkSource {
  #session: SessionSocket

  constructor() {
    super()

    this.#session = io('ws://localhost:65065', {
      autoConnect: false,
      retries: 100,
      rejectUnauthorized: false,
      transports: [WebSocketTransport],
      extraHeaders: {
        accept: 'msw/passthrough',
      },
    })
  }

  public async enable(): Promise<void> {
    this.#session.on('request', async (serializedRequest) => {
      console.log('[RemoteNetworkSource] received request:', serializedRequest)

      await this.queue(
        new RemoteHttpNetworkFrame({
          request: HttpPacket.deserializeRequest(serializedRequest),
          requestId: serializedRequest.id,
          session: this.#session,
        }),
      )
    })

    this.#session.connect()

    /**
     * @note Intentionally do NOT await the session connection.
     */
  }

  public async disable(): Promise<void> {
    this.#session.off('request')

    if (this.#session.connected) {
      const closePromise = new DeferredPromise<void>()
      this.#session.once('disconnect', () => closePromise.resolve())
      this.#session.disconnect()
      await closePromise
    }
  }
}

class RemoteHttpNetworkFrame extends HttpNetworkFrame {
  #requestId: string
  #session: SessionSocket

  constructor(options: {
    request: Request
    requestId: string
    session: SessionSocket
  }) {
    super({ request: options.request })

    this.#requestId = options.requestId
    this.#session = options.session
  }

  #send(payload: unknown): void {
    this.#session.emit(`response:${this.#requestId}`, payload)
  }

  public passthrough(): void {
    this.#send(undefined)
  }

  public respondWith(response?: Response): void {
    if (response == null) {
      return this.#send(undefined)
    }

    const packet = HttpPacket.serializeResponse(response)
    this.#send(packet)
  }

  public errorWith(reason?: unknown): void {
    throw new Error('Not Implemented')
  }
}
