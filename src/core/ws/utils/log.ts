import type {
  WebSocketClientConnection,
  WebSocketConnectionData,
  WebSocketData,
} from '@mswjs/interceptors/WebSocket'
import { devUtils } from '../../utils/internal/devUtils'
import { getTimestamp } from '../../utils/logging/getTimestamp'
import { toPublicUrl } from '../../utils/request/toPublicUrl'
import { getMessageLength } from './getMessageLength'
import { getPublicData } from './getPublicData'

export function attachLogger(connection: WebSocketConnectionData): void {
  const { client, server } = connection

  logConnectionOpen(client)

  // Log the events sent from the WebSocket client.
  // WebSocket client connection object is written from the
  // server's perspective so these message events are outgoing.
  /**
   * @todo Provide the reference to the exact event handler
   * that called this `client.send()`.
   */
  client.addEventListener('message', (event) => {
    logOutgoingClientMessage(event)
  })

  client.addEventListener('close', (event) => {
    logConnectionClose(event)
  })

  // Log the events received by the WebSocket client.
  // "client.socket" references the actual WebSocket instance
  // so these message events are incoming messages.
  client.socket.addEventListener('message', (event) => {
    logIncomingClientMessage(event)
  })

  // Log client errors (connection closures due to errors).
  client.socket.addEventListener('error', (event) => {
    logClientError(event)
  })

  client.send = new Proxy(client.send, {
    apply(target, thisArg, args) {
      const [data] = args
      const messageEvent = new MessageEvent('message', { data })
      Object.defineProperties(messageEvent, {
        currentTarget: {
          enumerable: true,
          writable: false,
          value: client.socket,
        },
        target: {
          enumerable: true,
          writable: false,
          value: client.socket,
        },
      })
      logIncomingMockedClientMessage(messageEvent)

      return Reflect.apply(target, thisArg, args)
    },
  })

  server.addEventListener(
    'open',
    () => {
      server.addEventListener('message', (event) => {
        logIncomingServerMessage(event)
      })
    },
    { once: true },
  )

  // Log outgoing client events initiated by the event handler.
  // The actual client never sent these but the handler did.
  server.send = new Proxy(server.send, {
    apply(target, thisArg, args) {
      const [data] = args
      const messageEvent = new MessageEvent('message', { data })
      Object.defineProperties(messageEvent, {
        currentTarget: {
          enumerable: true,
          writable: false,
          value: server['realWebSocket'],
        },
        target: {
          enumerable: true,
          writable: false,
          value: server['realWebSocket'],
        },
      })

      logOutgoingMockedClientMessage(messageEvent)

      return Reflect.apply(target, thisArg, args)
    },
  })
}

/**
 * Prints the WebSocket connection.
 * This is meant to be logged by every WebSocket handler
 * that intercepted this connection. This helps you see
 * what handlers observe this connection.
 */
export function logConnectionOpen(client: WebSocketClientConnection) {
  const publicUrl = toPublicUrl(client.url)

  console.groupCollapsed(
    devUtils.formatMessage(`${getTimestamp()} %c▸%c ${publicUrl}`),
    'color:blue',
    'color:inherit',
  )
  console.log('Client:', client.socket)
  console.groupEnd()
}

/**
 * Prints the outgoing client message.
 */
export async function logOutgoingClientMessage(
  event: MessageEvent<WebSocketData>,
) {
  const byteLength = getMessageLength(event.data)
  const publicData = await getPublicData(event.data)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c↑%c ${publicData} %c${byteLength}%c`,
    ),
    'color:green',
    'color:inherit',
    'color:gray;font-weight:normal',
    'color:inherit;font-weight:inherit',
  )
  console.log(event)
  console.groupEnd()
}

/**
 * Prints the outgoing client message initiated
 * by `server.send()` in the event handler.
 */
export async function logOutgoingMockedClientMessage(
  event: MessageEvent<WebSocketData>,
) {
  const byteLength = getMessageLength(event.data)
  const publicData = await getPublicData(event.data)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c⇡%c ${publicData} %c${byteLength}%c`,
    ),
    'color:orangered',
    'color:inherit',
    'color:gray;font-weight:normal',
    'color:inherit;font-weight:inherit',
  )
  console.log(event)
  console.groupEnd()
}

/**
 * Prings the message received by the WebSocket client.
 * This is fired when the "message" event is dispatched
 * on the actual WebSocket client instance, and translates to
 * the client receiving a message from the server.
 */
export async function logIncomingClientMessage(
  event: MessageEvent<WebSocketData>,
) {
  const byteLength = getMessageLength(event.data)
  const publicData = await getPublicData(event.data)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c↓%c ${publicData} %c${byteLength}%c`,
    ),
    'color:red',
    'color:inherit',
    'color:gray;font-weight:normal',
    'color:inherit;font-weight:inherit',
  )
  console.log(event)
  console.groupEnd()
}

/**
 * Prints the outgoing client message initiated
 * by `client.send()` in the event handler.
 */
export async function logIncomingMockedClientMessage(
  event: MessageEvent<WebSocketData>,
) {
  const byteLength = getMessageLength(event.data)
  const publicData = await getPublicData(event.data)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c⇣%c ${publicData} %c${byteLength}%c`,
    ),
    'color:orangered',
    'color:inherit',
    'color:gray;font-weight:normal',
    'color:inherit;font-weight:inherit',
  )
  console.log(event)
  console.groupEnd()
}

function logConnectionClose(event: CloseEvent) {
  const target = event.target as WebSocket
  const publicUrl = toPublicUrl(target.url)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c■%c ${publicUrl}`,
    ),
    'color:blue',
    'color:inherit',
  )
  console.log(event)
  console.groupEnd()
}

export async function logIncomingServerMessage(
  event: MessageEvent<WebSocketData>,
) {
  const byteLength = getMessageLength(event.data)
  const publicData = await getPublicData(event.data)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c⇣%c ${publicData} %c${byteLength}%c`,
    ),
    'color:orangered',
    'color:inherit',
    'color:gray;font-weight:normal',
    'color:inherit;font-weight:inherit',
  )
  console.log(event)
  console.groupEnd()
}

function logClientError(event: Event) {
  const socket = event.target as WebSocket
  const publicUrl = toPublicUrl(socket.url)

  console.groupCollapsed(
    devUtils.formatMessage(
      `${getTimestamp({ milliseconds: true })} %c\u00D7%c ${publicUrl}`,
    ),
    'color:red',
    'color:inherit',
  )
  console.log(event)
  console.groupEnd()
}
