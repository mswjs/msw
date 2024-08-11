// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const server = setupServer()
const wsServer = new WebSocketServer()

beforeAll(async () => {
  server.listen()
  await wsServer.listen()
})

afterEach(() => {
  server.resetHandlers()
  wsServer.resetState()
})

afterAll(async () => {
  server.close()
  await wsServer.close()
})

it('encodes data sent from the interceptor', async () => {
  const api = ws.link('ws://localhost', {
    handleMessage(type, data) {
      if (type === 'incoming') {
        return decodeURI(data.toString())
      }
      return encodeURI(data.toString())
    },
  })

  server.use(
    api.on('connection', ({ client }) => {
      // Send raw data from the interceptor.
      // We don't expect the user to do the encoding.
      // That's the entire purpose of the `handleMessage` option.
      client.send('hello world')
    }),
  )

  const client = new WebSocket('ws://localhost')
  const messageListener = vi.fn()
  client.onmessage = messageListener

  await vi.waitFor(() => {
    expect(messageListener).toHaveBeenCalledOnce()
  })

  const [messageEvent] = messageListener.mock.calls[0]
  expect(messageEvent).toHaveProperty('type', 'message')
  // Must receive encoded data in the client.
  // This is equivalent to the client receiving an encoded
  // packate from a third-party WebSocket server.
  expect(messageEvent).toHaveProperty('data', 'hello%20world')
})

it('decodes data sent from the client', async () => {
  const api = ws.link('ws://localhost', {
    handleMessage(type, data) {
      if (type === 'incoming') {
        return decodeURI(data.toString())
      }
      return encodeURI(data.toString())
    },
  })

  const mockMessageListener = vi.fn()
  server.use(
    api.on('connection', ({ client }) => {
      client.addEventListener('message', mockMessageListener)
    }),
  )

  const client = new WebSocket('ws://localhost')

  // Send encoded message to the "server" (interceptor).
  // This is equivalent to a third-party encoding its payload
  // before sending it over WebSocket.
  client.onopen = () => client.send(encodeURI('from client'))

  await vi.waitFor(() => {
    expect(mockMessageListener).toHaveBeenCalledOnce()
  })

  // Must receive a decoded data in the interceptor.
  const [mockMessageEvent] = mockMessageListener.mock.calls[0]
  expect(mockMessageEvent).toHaveProperty('type', 'message')
  expect(mockMessageEvent).toHaveProperty('data', 'from client')
})

it('encodes data sent to the original server from the mock', async () => {
  const originalServerMessageListener = vi.fn()
  wsServer.on('connection', (ws) => {
    ws.addEventListener('message', originalServerMessageListener)
  })

  const api = ws.link(wsServer.url, {
    handleMessage(type, data) {
      if (type === 'incoming') {
        return decodeURI(data.toString())
      }
      return encodeURI(data.toString())
    },
  })

  server.use(
    api.on('connection', ({ server }) => {
      server.connect()
      server.send('hello world')
    }),
  )

  new WebSocket(wsServer.url)

  await vi.waitFor(() => {
    expect(originalServerMessageListener).toHaveBeenCalledOnce()
  })

  const [mockMessageEvent] = originalServerMessageListener.mock.calls[0]
  expect(mockMessageEvent).toHaveProperty('type', 'message')
  // Must send encoded data from `server.send()` in the mock.
  expect(mockMessageEvent).toHaveProperty('data', 'hello%20world')
})

it('preserves decoding when forwarding data from the client to the original server', async () => {
  const originalServerMessageListener = vi.fn()
  wsServer.on('connection', (ws) => {
    ws.addEventListener('message', originalServerMessageListener)
  })

  const api = ws.link(wsServer.url, {
    handleMessage(type, data) {
      if (type === 'incoming') {
        return decodeURI(data.toString())
      }
      return encodeURI(data.toString())
    },
  })

  server.use(
    api.on('connection', ({ server }) => {
      server.connect()
    }),
  )

  const client = new WebSocket(wsServer.url)
  client.onopen = () => client.send(encodeURI('hello world'))

  await vi.waitFor(() => {
    expect(originalServerMessageListener).toHaveBeenCalledOnce()
  })

  const [mockMessageEvent] = originalServerMessageListener.mock.calls[0]
  expect(mockMessageEvent).toHaveProperty('type', 'message')
  // Must send encoded data from `server.send()` in the mock.
  expect(mockMessageEvent).toHaveProperty('data', 'hello%20world')
})

it('decodes data received from the original server', async () => {
  wsServer.on('connection', (ws) => {
    ws.send(encodeURI('hello world'))
  })

  const api = ws.link(wsServer.url, {
    handleMessage(type, data) {
      if (type === 'incoming') {
        return decodeURI(data.toString())
      }
      return encodeURI(data.toString())
    },
  })

  const mockServerMessageListener = vi.fn()
  server.use(
    api.on('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', mockServerMessageListener)
    }),
  )

  const client = new WebSocket(wsServer.url)
  const clientMessageListener = vi.fn()
  client.onmessage = clientMessageListener

  await vi.waitFor(() => {
    expect(mockServerMessageListener).toHaveBeenCalledOnce()
  })

  const [mockMessageEvent] = mockServerMessageListener.mock.calls[0]
  expect(mockMessageEvent).toHaveProperty('type', 'message')
  // Must receive decoded data from the original server.
  expect(mockMessageEvent).toHaveProperty('data', 'hello world')
})
