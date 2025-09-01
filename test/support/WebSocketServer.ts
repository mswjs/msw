import { invariant } from 'outvariant'
import { Emitter } from 'strict-event-emitter'
import fastify, { FastifyInstance } from 'fastify'
import fastifyWebSocket, { SocketStream } from '@fastify/websocket'

type FastifySocket = SocketStream['socket']

type WebSocketEventMap = {
  connection: [client: FastifySocket]
}

export class WebSocketServer extends Emitter<WebSocketEventMap> {
  private _url?: string
  private app: FastifyInstance
  private clients: Set<FastifySocket>

  constructor() {
    super()
    this.clients = new Set()

    this.app = fastify()
    this.app.register(fastifyWebSocket)
    this.app.register(async (fastify) => {
      fastify.get('/', { websocket: true }, ({ socket }) => {
        this.clients.add(socket)
        socket.once('close', () => this.clients.delete(socket))

        this.emit('connection', socket)
      })
    })
  }

  get url(): string {
    invariant(
      this._url,
      'Failed to get "url" on WebSocketServer: server is not running. Did you forget to "await server.listen()"?',
    )
    return this._url
  }

  public async listen(port = 0): Promise<void> {
    const address = await this.app.listen({
      host: '127.0.0.1',
      port,
    })
    const url = new URL(address)
    url.protocol = url.protocol.replace(/^http/, 'ws')
    this._url = url.href
  }

  public resetState(): void {
    this.closeAllClients()
    this.removeAllListeners()
  }

  public closeAllClients(): void {
    this.clients.forEach((client) => {
      client.close()
    })
  }

  public async close(): Promise<void> {
    return this.app.close()
  }
}
