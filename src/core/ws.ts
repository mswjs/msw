import { Emitter } from 'strict-event-emitter'
import {
  WebSocketInterceptor,
  type WebSocketEventMap,
  type WebSocketClientConnection,
  type WebSocketServerConnection,
} from '@mswjs/interceptors/WebSocket'
import {
  type Path,
  matchRequestUrl,
  PathParams,
} from './utils/matching/matchRequestUrl'

/**
 * @fixme Will each "ws" import create a NEW intereptor?
 * Consider moving this away and reusing.
 */
const interceptor = new WebSocketInterceptor()
const emitter = new EventTarget()

interceptor.on('connection', (connection) => {
  const connectionMessage = new MessageEvent('connection', {
    data: connection,
    cancelable: true,
  })

  emitter.dispatchEvent(connectionMessage)

  // If none of the "ws" handlers matched,
  // establish the WebSocket connection as-is.
  if (!connectionMessage.defaultPrevented) {
    connection.server.connect()
    connection.client.on('message', (event) => {
      connection.server.send(event.data)
    })
  }
})

/**
 * Disposes of the WebSocket interceptor.
 * The interceptor is a singleton instantiated in the
 * "ws" API.
 */
export function disposeWebSocketInterceptor() {
  interceptor.dispose()
}

type WebSocketLinkHandlerEventMap = {
  connection: [
    args: {
      client: WebSocketClientConnection
      server: WebSocketServerConnection
      params: PathParams
    },
  ]
}

/**
 * Intercepts outgoing WebSocket connections to the given URL.
 *
 * @example
 * const chat = ws.link('wss://chat.example.com')
 * chat.on('connection', (connection) => {})
 */
function createWebSocketLinkHandler(url: Path) {
  const publicEmitter = new Emitter<WebSocketLinkHandlerEventMap>()

  // Apply the WebSocket interceptor.
  // This defers the WebSocket class patching to the first
  // "ws" event handler call. Repetitive calls to the "apply"
  // method have no effect.
  interceptor.apply()

  emitter.addEventListener(
    'connection',
    (event: MessageEvent<WebSocketEventMap['connection'][0]>) => {
      const { client, server } = event.data
      const match = matchRequestUrl(client.url, url)

      if (match.matches) {
        // Preventing the default on the connection event
        // will prevent the WebSocket connection from being
        // established.
        event.preventDefault()
        publicEmitter.emit('connection', {
          client,
          server,
          params: match.params || {},
        })
      }
    },
  )

  const { on, off, removeAllListeners } = publicEmitter

  return {
    on,
    off,
    removeAllListeners,
  }
}

export const ws = {
  link: createWebSocketLinkHandler,
}

//
// Public usage.
//

const chat = ws.link('wss://:roomId.service.com')

export const handlers = [
  chat.on('connection', ({ client }) => {
    client.on('message', (event) => {
      console.log(event.data)
      client.send('Hello from server!')
    })
  }),
]
