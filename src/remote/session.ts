import { DeferredPromise } from '@open-draft/deferred-promise'
import { io, Socket } from 'socket.io-client'
import { WebSocket as WebSocketTransport } from 'engine.io-client'
import type { NetworkSessionEventMap, RpcServerEventMap } from './events'

export type SessionSocket = Socket<RpcServerEventMap, NetworkSessionEventMap>

export class NetworkSession {
  #port: number
  #connected: DeferredPromise<SessionSocket>

  constructor(options: { port: number }) {
    this.#port = options.port
    this.#connected = new DeferredPromise<SessionSocket>()
  }

  public get socket(): Promise<SessionSocket> {
    return this.#connected
  }

  public async connect(): Promise<void> {
    const ws = io(`ws://localhost:${this.#port}`, {
      autoConnect: true,
      transportOptions: [WebSocketTransport],
      extraHeaders: {
        accept: 'msw/passthrough',
      },
    })

    ws.io
      .on('open', () => this.#connected.resolve(ws))
      .on('error', (error) => this.#connected.reject(error))

    await this.#connected
  }

  public async disconnect(): Promise<void> {
    const closePromise = new DeferredPromise<void>()
    const ws = await this.#connected

    ws.once('disconnect', () => closePromise.resolve())
    ws.disconnect()

    return closePromise
  }
}
