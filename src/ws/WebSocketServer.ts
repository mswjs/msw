import { EventEmitter } from 'events'
import { Mask } from '../setupWorker/glossary'
import { WebSocketMessageData, WebSocketServerEventMap } from './glossary'
import { MessageEventOverride } from './utils/MessageEventOverride'
import { WebSocketConnection } from './WebSocketConnection'
import { webSocketStorage } from './WebSocketStorage'

export class WebSocketServer {
  mask: Mask
  private connections: WebSocketConnection[] = []
  private emitter: EventEmitter
  private channel: BroadcastChannel | undefined

  constructor(mask: Mask, channel?: BroadcastChannel) {
    this.mask = mask
    this.emitter = new EventEmitter()
    this.channel = channel

    // Store all the links to know when a WebSocket instance
    // has a corresponding mocking link. If not, the instance must
    // operate as a regular WebSocket instance.
    webSocketStorage.addServer(this)

    this.addEventListener('connection', (connection) => {
      this.addConnection(connection)

      // Remove this connection from the internal list of connections
      // once the associated WebSocket client closes.
      connection.client.addEventListener('close', () => {
        this.removeConnection(connection)
      })
    })
  }

  private addConnection(connection: WebSocketConnection) {
    this.connections.push(connection)
  }

  private removeConnection(connection: WebSocketConnection) {
    const nextConnections = this.connections.filter((connectionRef) => {
      if (connectionRef.url === connection.url) {
        return connectionRef !== connection
      }

      return true
    })

    this.connections = nextConnections
  }

  addEventListener<EventType extends keyof WebSocketServerEventMap>(
    eventType: EventType,
    listener: WebSocketServerEventMap[EventType],
  ) {
    this.emitter.addListener(eventType, listener)
  }

  emit<Event extends keyof WebSocketServerEventMap>(
    eventType: Event,
    ...args: Parameters<WebSocketServerEventMap[Event]>
  ) {
    this.emitter.emit(eventType, ...args)
  }

  /**
   * Send the data to a single WebSocket client.
   */
  sendToClient(
    client: WebSocket,
    data: WebSocketMessageData,
    broadcast = true,
  ) {
    const messageEvent = new MessageEventOverride('message', data)
    client.dispatchEvent(messageEvent)
    this.emit('message', client, data)

    if (broadcast) {
      this.channel?.postMessage(data)
    }
  }

  /**
   * Send the data to all the WebSocket clients connected to this server.
   */
  sendToAllClients(data: WebSocketMessageData) {
    this.connections.forEach((connection) => {
      this.sendToClient(connection.client, data, false)
    })
  }

  /**
   * Closes a WebSocket server, stopping it from sending or receiving events.
   */
  close(callback?: () => void) {
    this.emit('close')
    this.emitter.removeAllListeners()
    callback?.()
  }
}
