import { webSocketStorage } from './webSocketStorage'
import { createCloseEvent } from './utils/createCloseEvent'
import { getDataLength } from './utils/getDataLength'
import { WebSocketServer } from './WebSocketServer'
import { WebSocketConnection } from './WebSocketConnection'
import { WebSocketMessageData } from './glossary'

export class WebSocketOvereride extends EventTarget implements WebSocket {
  private _realSocket: WebSocket | null = null
  private _server: WebSocketServer = null as any
  private _connection: WebSocketConnection = null as any

  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  binaryType: BinaryType = 'blob'

  readonly CLOSED = WebSocket.CLOSED
  readonly CLOSING = WebSocket.CLOSING
  readonly CONNECTING = WebSocket.CONNECTING
  readonly OPEN = WebSocket.OPEN

  private _bufferedAmount = 0
  private _extensions = ''
  private _protocol = ''
  private _readyState = WebSocket.CONNECTING
  private _url = ''

  private _onclose: ((event: CloseEvent) => any) | null = null
  private _onerror: ((event: Event) => any) | null = null
  private _onmessage: ((event: MessageEvent) => any) | null = null
  private _onopen: ((event: Event) => any) | null = null

  constructor(url: string, protocols?: string[] | string) {
    super()

    const urlRecord = new URL(url)

    // Validate WebSocket URL protocol.
    if (!['wss:', 'ws:'].includes(urlRecord.protocol)) {
      throw new Error(
        `SyntaxError: Failed to construct 'WebSocket': The URL's scheme must be either 'ws' or 'wss'. '${urlRecord.protocol}' is not allowed.`,
      )
    }

    // Forbid fragments (hashes) in the WebSocket URL.
    if (urlRecord.hash) {
      throw new Error(
        `SyntaxError: Failed to construct 'WebSocket': The URL contains a fragment identifier ('${urlRecord.hash}'). Fragment identifiers are not allowed in WebSocket URLs.`,
      )
    }

    this._url = urlRecord.toString()

    /**
     * @todo This constructor is not finished.
     */

    // Look up if there is a WebSocket link created to intercept
    // events to this WebSocket URL.
    const server = webSocketStorage.lookupServer(url)

    if (!server) {
      // Create an actual WebSocket instance.
      const UnpatchedWebSocket = (window as any)
        .UnpatchedWebSocket as typeof WebSocket
      this._realSocket = new UnpatchedWebSocket(url, protocols)

      // Return the actual WebSocket instance for clients to continue
      // operate with it, instead of the override instance.
      return this._realSocket as any
    }

    this._server = server

    setImmediate(() => {
      // Signal the server that a new client has connected.
      this._connection = new WebSocketConnection(this, this._server)
      this._server.emit('connection', this._connection)

      this._readyState = WebSocket.OPEN
      const openEvent = new Event('open')
      Object.defineProperty(openEvent, 'target', {
        writable: false,
        value: this,
      })
      this.dispatchEvent(openEvent)
    })
  }

  get url() {
    return this._url
  }

  get protocol() {
    return this._protocol
  }

  get bufferedAmount() {
    return this._bufferedAmount
  }

  get extensions() {
    return this._extensions
  }

  get readyState() {
    return this._readyState
  }

  get onclose() {
    return this._onclose
  }

  set onclose(listener) {
    if (this._onclose) {
      this.removeEventListener('close', this._onclose as EventListener)
      this._onclose = null
    }

    if (listener) {
      this.addEventListener('close', listener as EventListener)
      this._onclose = listener
    }
  }

  get onopen() {
    return this._onopen
  }

  set onopen(listener) {
    if (this._onopen) {
      this.removeEventListener('open', this._onopen as EventListener)
      this._onopen = null
    }

    if (listener) {
      this.addEventListener('open', listener as EventListener)
      this._onopen = listener
    }
  }

  get onmessage() {
    return this._onmessage
  }

  set onmessage(listener) {
    if (this._onmessage) {
      this.removeEventListener('message', this._onmessage as EventListener)
      this._onmessage = null
    }

    if (listener) {
      this.addEventListener('message', listener as EventListener)
      this._onmessage = listener
    }
  }

  get onerror() {
    return this._onerror
  }

  set onerror(listener) {
    if (this._onerror) {
      this.removeEventListener('error', this._onerror as EventListener)
      this._onerror = null
    }

    if (listener) {
      this.addEventListener('error', listener as EventListener)
      this._onerror = listener
    }
  }

  send(data: WebSocketMessageData) {
    if ([WebSocket.CONNECTING].includes(this.readyState)) {
      this.close()
      throw new Error('InvalidStateError')
    }

    if ([WebSocket.CLOSING, WebSocket.CLOSED].includes(this.readyState)) {
      const dataLength = getDataLength(data)
      this._bufferedAmount += dataLength
      return
    }

    // Dispatch the "message" event to the WebSocket server
    // to be able to react to the "ws.send()" messages from the client.
    this._connection.emit('message', data)
  }

  close(code = 1000, reason?: string) {
    if (!code || !(code === 1000 || (code >= 3000 && code < 5000))) {
      throw new Error(
        'InvalidAccessError: close code out of user configurable range',
      )
    }

    if ([WebSocket.CLOSING, WebSocket, this.CLOSED].includes(this.readyState)) {
      return
    }

    this._readyState = WebSocket.CLOSING

    setImmediate(() => {
      this._readyState = WebSocket.CLOSED

      const closeEvent = createCloseEvent({
        type: 'close',
        target: this,
        code,
        reason,
      })
      this.dispatchEvent(closeEvent)

      // Dispatch the "close" event to the WebSocket server
      // to notify about a closing client.
      this._connection.emit('close', code, reason || '')
    })
  }
}
