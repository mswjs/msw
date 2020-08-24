import { getTimestamp } from '../utils/logging/getTimestamp'
import { WebSocketServer } from './WebSocketServer'

/**
 * Prints out log messages on WebSocket server and connection events.
 */
export function logger(server: WebSocketServer) {
  const { mask } = server

  server.addEventListener('connection', (connection) => {
    const { client } = connection

    console.groupCollapsed(`[MSW] ${getTimestamp()} WS client connected`)
    console.log('URL:', mask)
    console.log('WebSocket:', client)
    console.groupEnd()

    connection.on('message', (data) => {
      console.groupCollapsed(
        `[MSW] ${getTimestamp()} WS incoming message event`,
      )
      console.log('URL:', mask)
      console.log('Data:', data)
      console.log('WebSocket:', client)
      console.groupEnd()
    })

    connection.on('close', () => {
      console.groupCollapsed(`[MSW] ${getTimestamp()} WS client closed`)
      console.log('URL:', mask)
      console.log('WebSocket:', client)
      console.groupEnd()
    })
  })

  server.addEventListener('message', (client, data) => {
    console.groupCollapsed(`[MSW] ${getTimestamp()} WS outgoing message event`)
    console.log('URL:', mask)
    console.log('Data:', data)
    console.log('WebSocket:', client)
    console.groupEnd()
  })

  server.addEventListener('close', () => {
    console.groupCollapsed(`[MSW] ${getTimestamp()} WS server closed`)
    console.log('URL:', mask)
    console.groupEnd()
  })
}
