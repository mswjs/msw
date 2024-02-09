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
      fastify.get('/', { websocket: true }, (connection) => {
        this.clients.add(connection.socket)
        this.emit('connection', connection.socket)
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

  public async listen(): Promise<void> {
    const address = await this.app.listen({ port: 0 })
    const url = new URL(address)
    url.protocol = url.protocol.replace(/^http/, 'ws')
    this._url = url.href
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
