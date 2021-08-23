import { EventEmitter } from 'events'
import { WebSocketMessageData, WebSocketServerEventMap } from './glossary'
import { MessageEventOverride } from './utils/MessageEventOverride'
import { WebSocketConnection } from './WebSocketConnection'
import { webSocketStorage } from './WebSocketStorage'

export class WebSocketServer {
  mask: string
  private connections: WebSocketConnection[] = []
  private emitter: EventEmitter
  private broadcastChannel?: BroadcastChannel

  constructor(mask: string, channel?: BroadcastChannel) {
    this.mask = mask
    this.emitter = new EventEmitter()
    this.broadcastChannel = channel

    // Store all the links to know when a WebSocket instance
    // has a corresponding mocking link. If not, the instance must
    // operate as a regular WebSocket instance.
    webSocketStorage.addServer(this)

    this.addListener('connection', (connection) => {
      this.addConnection(connection)

      // Remove this connection from the internal list of connections
      // once the associated WebSocket client closes.
      connection.client.addEventListener('close', () => {
        this.removeConnection(connection)
      })
    })
  }

  private addConnection(connection: WebSocketConnection): void {
    this.connections.push(connection)
  }

  private removeConnection(connection: WebSocketConnection): void {
    const nextConnections = this.connections.filter((connectionRef) => {
      if (connectionRef.url === connection.url) {
        return connectionRef !== connection
      }

      return true
    })

    this.connections = nextConnections
  }

  public addListener<EventType extends keyof WebSocketServerEventMap>(
    eventType: EventType,
    listener: WebSocketServerEventMap[EventType],
  ): void {
    this.emitter.addListener(eventType, listener)
  }

  public emit<Event extends keyof WebSocketServerEventMap>(
    eventType: Event,
    ...args: Parameters<WebSocketServerEventMap[Event]>
  ): void {
    this.emitter.emit(eventType, ...args)
  }

  /**
   * Send the data to a single client connected to this server.
   */
  public sendToClient(
    client: WebSocket,
    data: WebSocketMessageData,
    broadcast = true,
  ): void {
    const messageEvent = new MessageEventOverride('message', data)
    client.dispatchEvent(messageEvent)
    this.emit('message', client, data)

    if (broadcast) {
      this.broadcastChannel?.postMessage(data)
    }
  }

  /**
   * Send the data to all the clients connected to this server.
   */
  public sendToAllClients(data: WebSocketMessageData): void {
    this.connections.forEach((connection) => {
      this.sendToClient(connection.client, data, false)
    })
  }

  /**
   * Closes a server instance so it can no longer receive or send events.
   */
  public close(callback?: () => void): void {
    this.emit('close')
    this.emitter.removeAllListeners()
    callback?.()
  }
}
