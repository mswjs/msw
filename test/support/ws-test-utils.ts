import type { WebSocketConnectionData } from '@mswjs/interceptors/WebSocket'
import {
  WebSocketClientConnection,
  WebSocketServerConnection,
} from '@mswjs/interceptors/WebSocket'
import type {
  WebSocketTransport,
  WebSocketData,
} from '@mswjs/interceptors/WebSocket'

export class TestWebSocketTransport
  extends EventTarget
  implements WebSocketTransport
{
  send(_data: WebSocketData): void {}
  close(_code?: number | undefined, _reason?: string | undefined): void {}
}

export function createTestWebSocketConnection(
  url: string | URL,
): WebSocketConnectionData {
  const socket = new WebSocket(url)
  const transport = new TestWebSocketTransport()

  return {
    client: new WebSocketClientConnection(socket, transport),
    server: new WebSocketServerConnection(
      socket as any,
      transport as any,
      () => socket,
    ),
    info: {
      protocols: [],
    },
  }
}
