import { EventEmitter } from 'events'
import { WebSocketConnectionEventMap, WebSocketMessageData } from './glossary'
import { WebSocketServer } from './WebSocketServer'

export class WebSocketConnection {
  client: WebSocket
  private server: WebSocketServer
  private emitter: EventEmitter

  constructor(client: WebSocket, server: WebSocketServer) {
    this.client = client
    this.server = server
    this.emitter = new EventEmitter()
  }

  get url(): string {
    return this.client.url
  }

  get protocol(): string {
    return this.protocol
  }

  get readyState(): number {
    return this.readyState
  }

  get onopen(): any {
    return this.onopen
  }

  get onmessage(): any {
    return this.onmessage
  }

  get onerror(): any {
    return this.onerror
  }

  get onclose(): any {
    return this.onclose
  }

  get close(): any {
    return this.close
  }

  /**
   * Handles events from the WebSocket client.
   */
  on<EventType extends keyof WebSocketConnectionEventMap>(
    eventType: EventType,
    listener: WebSocketConnectionEventMap[EventType],
  ) {
    this.emitter.addListener(eventType, listener)
  }

  emit<EventType extends keyof WebSocketConnectionEventMap>(
    eventType: EventType,
    ...args: Parameters<WebSocketConnectionEventMap[EventType]>
  ) {
    this.emitter.emit(eventType, ...args)
  }

  /**
   * Sends data to the WebSocket client.
   */
  send(data: WebSocketMessageData) {
    this.server.sendToClient(this.client, data)
  }

  terminate() {
    this.client.close()
    this.emitter.removeAllListeners()
  }
}
