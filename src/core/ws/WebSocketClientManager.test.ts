/**
 * @vitest-environment node-websocket
 */
import {
  WebSocketClientConnection,
  WebSocketData,
  WebSocketTransport,
} from '@mswjs/interceptors/WebSocket'
import {
  WebSocketClientManager,
  WebSocketBroadcastChannelMessage,
} from './WebSocketClientManager'

const channel = new BroadcastChannel('test:channel')
vi.spyOn(channel, 'postMessage')

const socket = new WebSocket('ws://localhost')

class TestWebSocketTransport extends EventTarget implements WebSocketTransport {
  send(_data: WebSocketData): void {}
  close(_code?: number | undefined, _reason?: string | undefined): void {}
}

afterEach(() => {
  vi.resetAllMocks()
})

it('adds a client from this runtime to the list of clients', () => {
  const manager = new WebSocketClientManager(channel, '*')
  const connection = new WebSocketClientConnection(
    socket,
    new TestWebSocketTransport(),
  )

  manager.addConnection(connection)

  // Must add the client to the list of clients.
  expect(Array.from(manager.clients.values())).toEqual([connection])
})

it('replays a "send" event coming from another runtime', async () => {
  const manager = new WebSocketClientManager(channel, '*')
  const connection = new WebSocketClientConnection(
    socket,
    new TestWebSocketTransport(),
  )
  manager.addConnection(connection)
  vi.spyOn(connection, 'send')

  // Emulate another runtime signaling this connection to receive data.
  channel.dispatchEvent(
    new MessageEvent<WebSocketBroadcastChannelMessage>('message', {
      data: {
        type: 'extraneous:send',
        payload: {
          clientId: connection.id,
          data: 'hello',
        },
      },
    }),
  )

  await vi.waitFor(() => {
    // Must execute the requested operation on the connection.
    expect(connection.send).toHaveBeenCalledWith('hello')
    expect(connection.send).toHaveBeenCalledTimes(1)
  })
})

it('replays a "close" event coming from another runtime', async () => {
  const manager = new WebSocketClientManager(channel, '*')
  const connection = new WebSocketClientConnection(
    socket,
    new TestWebSocketTransport(),
  )
  manager.addConnection(connection)
  vi.spyOn(connection, 'close')

  // Emulate another runtime signaling this connection to close.
  channel.dispatchEvent(
    new MessageEvent<WebSocketBroadcastChannelMessage>('message', {
      data: {
        type: 'extraneous:close',
        payload: {
          clientId: connection.id,
          code: 1000,
          reason: 'Normal closure',
        },
      },
    }),
  )

  await vi.waitFor(() => {
    // Must execute the requested operation on the connection.
    expect(connection.close).toHaveBeenCalledWith(1000, 'Normal closure')
    expect(connection.close).toHaveBeenCalledTimes(1)
  })
})

it('removes the extraneous message listener when the connection closes', async () => {
  const manager = new WebSocketClientManager(channel, '*')
  const transport = new TestWebSocketTransport()
  const connection = new WebSocketClientConnection(socket, transport)
  vi.spyOn(connection, 'close').mockImplementationOnce(() => {
    /**
     * @note This is a nasty hack so we don't have to uncouple
     * the connection from transport. Creating a mock transport
     * is difficult because it relies on the `WebSocketOverride` class.
     * All we care here is that closing the connection triggers
     * the transport closure, which it always does.
     */
    transport.dispatchEvent(new Event('close'))
  })
  vi.spyOn(connection, 'send')

  manager.addConnection(connection)
  connection.close()

  // Signals from other runtimes have no effect on the closed connection.
  channel.dispatchEvent(
    new MessageEvent<WebSocketBroadcastChannelMessage>('message', {
      data: {
        type: 'extraneous:send',
        payload: {
          clientId: connection.id,
          data: 'hello',
        },
      },
    }),
  )

  expect(connection.send).not.toHaveBeenCalled()
})
