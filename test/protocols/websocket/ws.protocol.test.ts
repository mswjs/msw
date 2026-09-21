import { ws, WebSocketProtocol, type WebSocketData } from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

// Data on the wire is uppercase, data in the handler is lowercase.
class Uppercase extends WebSocketProtocol<string> {
  public encode(data: string): string {
    return data.toUpperCase()
  }

  public decode(data: WebSocketData): string | undefined {
    return typeof data === 'string' ? data.toLowerCase() : undefined
  }
}

class UppercaseWithHandshake extends Uppercase {
  public *handshake(): Generator<string> {
    yield 'HELLO'
    yield 'WORLD'
  }
}

// Every word of a message is sent as a separate frame.
class Words extends WebSocketProtocol<string> {
  public *encode(data: string): Generator<string, string> {
    const [first, second] = data.split(' ')
    yield first
    return second
  }

  public decode(data: WebSocketData): string | undefined {
    return typeof data === 'string' ? data : undefined
  }
}

/**
 * @note The original server used in the passthrough scenarios echoes
 * every frame it receives ("?echo"). The echoed frame is forwarded to
 * the WebSocket instance as-is, so whatever the WebSocket instance
 * receives is exactly what the original server received.
 */

test('decodes the client frame for the handler and forwards it to the original server as-is', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?echo').href
  const api = ws.link(serverUrl, { protocol: new Uppercase() })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onServerData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client, server }) => {
      server.connect()
      client.addEventListener('message', (event) => onClientData(event.data))
      server.addEventListener('message', (event) => onServerData(event.data))
    }),
  )

  const socket = new WebSocket(serverUrl)
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)
  socket.onopen = () => socket.send('HELLO')

  await expect
    .poll(() => onClientData, { message: 'decodes the client frame' })
    .toHaveBeenCalledExactlyOnceWith('hello')
  await expect
    .poll(() => onServerData, { message: 'decodes the echoed frame' })
    .toHaveBeenCalledExactlyOnceWith('hello')
  await expect
    .poll(() => onSocketData, {
      message: 'the original server received the raw client frame',
    })
    .toHaveBeenCalledExactlyOnceWith('HELLO')
})

test('encodes the handler message sent to the original server', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?echo').href
  const api = ws.link(serverUrl, { protocol: new Uppercase() })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onServerData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client, server }) => {
      server.connect()
      client.addEventListener('message', (event) => onClientData(event.data))
      server.addEventListener('message', (event) => onServerData(event.data))
      server.send('hello from handler')
    }),
  )

  const socket = new WebSocket(serverUrl)
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)

  await expect
    .poll(() => onServerData, { message: 'decodes the echoed frame' })
    .toHaveBeenCalledExactlyOnceWith('hello from handler')
  await expect
    .poll(() => onSocketData, {
      message: 'the original server received the encoded frame',
    })
    .toHaveBeenCalledExactlyOnceWith('HELLO FROM HANDLER')
  expect(
    onClientData,
    'the WebSocket instance sent nothing',
  ).not.toHaveBeenCalled()
})

test('encodes the handler message sent to the WebSocket instance on a passthrough connection', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?echo').href
  const api = ws.link(serverUrl, { protocol: new Uppercase() })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onServerData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client, server }) => {
      server.connect()
      server.addEventListener('message', (event) => onServerData(event.data))
      client.addEventListener('message', (event) => {
        onClientData(event.data)
        client.send(`reply to ${event.data}`)
      })
    }),
  )

  const socket = new WebSocket(serverUrl)
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)
  socket.onopen = () => socket.send('HELLO')

  await expect
    .poll(() => onClientData, { message: 'decodes the client frame' })
    .toHaveBeenCalledExactlyOnceWith('hello')
  await expect
    .poll(() => onServerData, { message: 'decodes the echoed frame' })
    .toHaveBeenCalledExactlyOnceWith('hello')
  await expect
    .poll(() => onSocketData, {
      message: 'receives the encoded reply and the echoed frame',
    })
    .toHaveBeenCalledTimes(2)
  expect.soft(onSocketData).toHaveBeenCalledWith('REPLY TO HELLO')
  expect
    .soft(onSocketData, 'the original server received the raw client frame')
    .toHaveBeenCalledWith('HELLO')
})

test('decodes the client frame for the handler and encodes the reply on a mocked connection', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', { protocol: new Uppercase() })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => {
        onClientData(event.data)
        client.send(`reply to ${event.data}`)
      })
    }),
  )

  const socket = new WebSocket('ws://localhost/ws')
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)
  socket.onopen = () => socket.send('HELLO')

  await expect
    .poll(() => onClientData, { message: 'decodes the client frame' })
    .toHaveBeenCalledExactlyOnceWith('hello')
  await expect
    .poll(() => onSocketData, { message: 'encodes the reply' })
    .toHaveBeenCalledExactlyOnceWith('REPLY TO HELLO')
})

test('encodes a single handler message into multiple frames', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', { protocol: new Words() })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => onClientData(event.data))
      client.send('hello world')
    }),
  )

  const socket = new WebSocket('ws://localhost/ws')
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)

  await expect
    .poll(() => onSocketData, { message: 'receives two frames' })
    .toHaveBeenCalledTimes(2)
  expect.soft(onSocketData).toHaveBeenNthCalledWith(1, 'hello')
  expect.soft(onSocketData).toHaveBeenNthCalledWith(2, 'world')
  expect(
    onClientData,
    'the WebSocket instance sent nothing',
  ).not.toHaveBeenCalled()
})

test('sends the protocol handshake once the mocked connection opens', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', {
    protocol: new UppercaseWithHandshake(),
  })
  const onClientData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ client }) => {
      client.addEventListener('message', (event) => onClientData(event.data))
      client.addEventListener('open', () => client.send('ready'))
    }),
  )

  const socket = new WebSocket('ws://localhost/ws')
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)

  await expect
    .poll(() => onSocketData, { message: 'receives the handshake first' })
    .toHaveBeenCalledTimes(3)
  expect
    .soft(onSocketData, 'the handshake frames are raw')
    .toHaveBeenNthCalledWith(1, 'HELLO')
  expect.soft(onSocketData).toHaveBeenNthCalledWith(2, 'WORLD')
  expect
    .soft(onSocketData, 'the message sent on open follows the handshake')
    .toHaveBeenNthCalledWith(3, 'READY')
  expect(
    onClientData,
    'the WebSocket instance sent nothing',
  ).not.toHaveBeenCalled()
})

test('does not send the protocol handshake on a passthrough connection', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const api = ws.link(serverUrl, { protocol: new UppercaseWithHandshake() })
  const onServerData = vi.fn<(data: unknown) => void>()
  const onSocketData = vi.fn<(data: unknown) => void>()

  network.use(
    api.addEventListener('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', (event) => onServerData(event.data))
    }),
  )

  const socket = new WebSocket(serverUrl)
  onTestFinished(() => socket.close())
  socket.onmessage = (event) => onSocketData(event.data)

  await expect
    .poll(() => onServerData, { message: 'decodes the server greeting' })
    .toHaveBeenCalledExactlyOnceWith('hello from server')
  await expect
    .poll(() => onSocketData, { message: 'forwards the server greeting' })
    .toHaveBeenCalledExactlyOnceWith('hello from server')
})
