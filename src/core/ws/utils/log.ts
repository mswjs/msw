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

  client.addEventListener('message', (event) => {
    logOutgoingMessage(event)
  })

  client.addEventListener('close', (event) => {
    logConnectionClose(event)
  })

  server.addEventListener('message', (event) => {
    logIncomingMessage(event)
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
export async function logOutgoingMessage(event: MessageEvent<WebSocketData>) {
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

export async function logIncomingMessage(event: MessageEvent<WebSocketData>) {
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

function logConnectionClose(event: CloseEvent) {
  const target = event.target as WebSocket
  const publicUrl = toPublicUrl(target.url)

  console.groupCollapsed(
    devUtils.formatMessage(`${getTimestamp()} %c▸%c ${publicUrl}`),
    'color:blue',
    'color:inherit',
  )
  console.log(event)
  console.groupEnd()
}
