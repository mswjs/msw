import { EventEmitter } from 'events'
import { WebSocketConnectionEventMap, WebSocketMessageData } from './glossary'
import { WebSocketServer } from './WebSocketServer'

export class WebSocketConnection {
  public client: WebSocket

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
  public on<EventType extends keyof WebSocketConnectionEventMap>(
    eventType: EventType,
    listener: WebSocketConnectionEventMap[EventType],
  ): void {
    this.emitter.addListener(eventType, listener)
  }

  public emit<EventType extends keyof WebSocketConnectionEventMap>(
    eventType: EventType,
    ...args: Parameters<WebSocketConnectionEventMap[EventType]>
  ): void {
    this.emitter.emit(eventType, ...args)
  }

  /**
   * Sends data to the WebSocket client.
   */
  public send(data: WebSocketMessageData): void {
    this.server.sendToClient(this.client, data)
  }

  public terminate(): void {
    this.client.close()
    this.emitter.removeAllListeners()
  }
}
