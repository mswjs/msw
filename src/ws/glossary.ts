import { WebSocketConnection } from './WebSocketConnection'

export type WebSocketMessageData =
  | string
  | ArrayBufferLike
  | Blob
  | ArrayBufferView

/**
 * Map of events that a WebSocket server can listen to.
 */
export interface WebSocketServerEventMap {
  /**
   * Handle a new connection to a WebSocket client has been established.
   */
  connection: (ws: WebSocketConnection) => void

  message: (ws: WebSocket, data: WebSocketMessageData) => void

  /**
   * Handle an error on the server.
   */
  error: (ws: WebSocket, error: Error) => any

  /**
   * Handle a WebSocket server being closed.
   */
  close: () => void
}

export interface WebSocketConnectionEventMap {
  /**
   * Handle a message from a WebSocket client has been received.
   */
  message: (data: WebSocketMessageData) => void

  /**
   * Handle a WebSocket connection being closed.
   */
  close: (code: number, reason: string) => void
}

export interface WebSocketLinkOptions {
  /**
   * Disable logging of the events.
   */
  quiet?: boolean
}
