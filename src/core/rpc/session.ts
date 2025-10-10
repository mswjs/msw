import { DeferredPromise } from '@open-draft/deferred-promise'
import { io, Socket } from 'socket.io-client'
import { WebSocket as WebSocketTransport } from 'engine.io-client'
import { NetworkSessionEventMap, RpcServerEventMap } from './events'

export type SessionSocket = Socket<RpcServerEventMap, NetworkSessionEventMap>

/**
 * Creates a new network session that transports can use
 * to transfer packets. The session only provisions the underlying
 * connection but does not implement sending. Sending is implemented
 * by individual packets as they are closer to the protocol specifics.
 */
export class NetworkSession {
  #port: number
  #connected: DeferredPromise<SessionSocket>

  constructor(args: { port: number }) {
    this.#port = args.port
    this.#connected = new DeferredPromise<SessionSocket>()
  }

  public getSocket(): Promise<SessionSocket> {
    return this.#connected
  }

  public async connect(): Promise<void> {
    const ws = io(`ws://localhost:${this.#port}`, {
      autoConnect: true,
      transports: [WebSocketTransport],
      extraHeaders: {
        accept: 'msw/passthrough',
      },
    })

    ws.io.on('open', () => this.#connected.resolve(ws))
    ws.io.on('error', (error) => this.#connected.reject(error))

    await this.#connected
  }

  public async close(): Promise<void> {
    const closePromise = new DeferredPromise<void>()
    const ws = await this.#connected

    ws.once('disconnect', () => {
      closePromise.resolve()
    })

    ws.disconnect()

    return closePromise
  }
}
