import {
  ws,
  WebSocketExtension,
  type WebSocketData,
  type WebSocketExtensionContext,
} from 'msw/ws'
import { test, expect } from '../../setup/vitest-helpers'

// Data on the wire is uppercase, data in the handler is lowercase.
class Uppercase extends WebSocketExtension<string> {
  public encode(data: string): string {
    return data.toUpperCase()
  }

  public decode(data: WebSocketData): string | undefined {
    return typeof data === 'string' ? data.toLowerCase() : undefined
  }
}

class UppercaseWithHandshake extends Uppercase {
  public *connect(): Generator<string> {
    yield 'HELLO'
    yield 'WORLD'
  }
}

// Every word of a message is sent as a separate frame.
class Words extends WebSocketExtension<string> {
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
  const api = ws.link(serverUrl, { extensions: [new Uppercase()] })
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
  const api = ws.link(serverUrl, { extensions: [new Uppercase()] })
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
  const api = ws.link(serverUrl, { extensions: [new Uppercase()] })
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
  const api = ws.link('ws://localhost/ws', { extensions: [new Uppercase()] })
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
  const api = ws.link('ws://localhost/ws', { extensions: [new Words()] })
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

test('sends the extension handshake once the mocked connection opens', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', {
    extensions: [new UppercaseWithHandshake()],
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

test('does not send the extension handshake on a passthrough connection', async ({
  network,
  testServer,
}) => {
  const serverUrl = testServer.ws.url('/?greet').href
  const api = ws.link(serverUrl, { extensions: [new UppercaseWithHandshake()] })
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

// Adds a greeting to every connection.
class Greeting extends Uppercase {
  public extend({ client }: WebSocketExtensionContext<string>): {
    greeting: string
  } {
    return { greeting: `welcome to ${client.url.pathname}` }
  }
}

test('exposes the extension API on the connection event', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', { extensions: [new Greeting()] })
  const onConnection = vi.fn<(greeting: string) => void>()

  network.use(
    api.addEventListener('connection', ({ greeting }) => {
      onConnection(greeting)
    }),
  )

  const socket = new WebSocket('ws://localhost/ws')
  onTestFinished(() => socket.close())

  await expect
    .poll(() => onConnection)
    .toHaveBeenCalledExactlyOnceWith('welcome to /ws')
})

// Adds a farewell to every connection.
class Farewell extends Uppercase {
  public extend(): { farewell: string } {
    return { farewell: 'see you' }
  }
}

test('merges the APIs of every extension, applied left to right', async ({
  network,
}) => {
  const api = ws.link('ws://localhost/ws', {
    extensions: [new Greeting(), new Farewell()],
  })
  const onConnection = vi.fn<(greeting: string, farewell: string) => void>()

  network.use(
    api.addEventListener('connection', ({ greeting, farewell }) => {
      onConnection(greeting, farewell)
    }),
  )

  const socket = new WebSocket('ws://localhost/ws')
  onTestFinished(() => socket.close())

  await expect
    .poll(() => onConnection)
    .toHaveBeenCalledExactlyOnceWith('welcome to /ws', 'see you')
})
