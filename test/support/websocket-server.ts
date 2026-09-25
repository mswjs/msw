import { invariant } from 'outvariant'
import { Emitter, TypedEvent } from 'rettime'
import fastify, { type FastifyInstance } from 'fastify'
import fastifyWebSocket, {
  type WebSocket as FastifySocket,
} from '@fastify/websocket'

type WebSocketEventMap = {
  connection: TypedEvent<FastifySocket>
}

export class WebSocketServer {
  private _url?: string
  private app: FastifyInstance
  private clients: Set<FastifySocket>
  private emitter: Emitter<WebSocketEventMap>

  constructor() {
    this.clients = new Set()
    this.emitter = new Emitter()

    this.app = fastify()
    this.app.register(fastifyWebSocket)
    this.app.register(async (fastify) => {
      fastify.get('/', { websocket: true }, (socket) => {
        this.clients.add(socket)
        socket.once('close', () => this.clients.delete(socket))

        this.emitter.emit(new TypedEvent('connection', { data: socket }))
      })
    })
  }

  /**
   * @note Keep the `ws`-like listener signature (the client as the
   * first argument) so this helper mirrors an actual WebSocket server.
   */
  public on(
    event: 'connection',
    listener: (client: FastifySocket) => void,
  ): void {
    this.emitter.on(event, (event) => {
      listener(event.data)
    })
  }

  public once(
    event: 'connection',
    listener: (client: FastifySocket) => void,
  ): void {
    this.emitter.once(event, (event) => {
      listener(event.data)
    })
  }

  public removeAllListeners(): void {
    this.emitter.removeAllListeners()
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
