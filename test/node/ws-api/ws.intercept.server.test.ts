/**
 * @vitest-environment node-websocket
 */
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const server = setupServer()
const originalServer = new WebSocketServer()

const service = ws.link('ws://*')

beforeAll(async () => {
  server.listen()
  await originalServer.listen()
})

afterEach(() => {
  server.resetHandlers()
  originalServer.resetState()
})

afterAll(async () => {
  server.close()
  await originalServer.close()
})

it('intercepts incoming server text message', async () => {
  const serverMessageListener = vi.fn()
  const clientMessageListener = vi.fn()

  originalServer.on('connection', (client) => {
    client.send('hello')
  })
  server.use(
    service.on('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', serverMessageListener)
    }),
  )

  const ws = new WebSocket(originalServer.url)
  ws.addEventListener('message', clientMessageListener)

  await vi.waitFor(() => {
    expect(serverMessageListener).toHaveBeenCalledTimes(1)

    const serverMessage = serverMessageListener.mock.calls[0][0] as MessageEvent
    expect(serverMessage.type).toBe('message')
    expect(serverMessage.data).toBe('hello')

    expect(clientMessageListener).toHaveBeenCalledTimes(1)

    const clientMessage = clientMessageListener.mock.calls[0][0] as MessageEvent
    expect(clientMessage.type).toBe('message')
    expect(clientMessage.data).toBe('hello')
  })
})

it('intercepts incoming server Blob message', async () => {
  const serverMessageListener = vi.fn()
  const clientMessageListener = vi.fn()

  originalServer.on('connection', async (client) => {
    /**
     * @note You should use plain `Blob` instead.
     * For some reason, the "ws" package has trouble accepting
     * it as an input (expects a Buffer).
     */
    client.send(await new Blob(['hello']).arrayBuffer())
  })
  server.use(
    service.on('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', serverMessageListener)
    }),
  )

  const ws = new WebSocket(originalServer.url)
  ws.addEventListener('message', clientMessageListener)

  await vi.waitFor(() => {
    expect(serverMessageListener).toHaveBeenCalledTimes(1)

    const serverMessage = serverMessageListener.mock.calls[0][0] as MessageEvent
    expect(serverMessage.type).toBe('message')
    expect(serverMessage.data).toEqual(new Blob(['hello']))

    expect(clientMessageListener).toHaveBeenCalledTimes(1)

    const clientMessage = clientMessageListener.mock.calls[0][0] as MessageEvent
    expect(clientMessage.type).toBe('message')
    expect(clientMessage.data).toEqual(new Blob(['hello']))
  })
})

it('intercepts incoming ArrayBuffer message', async () => {
  const encoder = new TextEncoder()
  const serverMessageListener = vi.fn()
  const clientMessageListener = vi.fn()

  originalServer.on('connection', async (client) => {
    client.send(encoder.encode('hello world'))
  })
  server.use(
    service.on('connection', ({ server }) => {
      server.connect()
      server.addEventListener('message', serverMessageListener)
    }),
  )

  const ws = new WebSocket(originalServer.url)
  ws.addEventListener('message', clientMessageListener)

  await vi.waitFor(() => {
    expect(serverMessageListener).toHaveBeenCalledTimes(1)

    const serverMessage = serverMessageListener.mock.calls[0][0] as MessageEvent
    expect(serverMessage.type).toBe('message')
    /**
     * @note For some reason, "ws" still sends back a Blob.
     */
    expect(serverMessage.data).toEqual(new Blob(['hello world']))

    expect(clientMessageListener).toHaveBeenCalledTimes(1)

    const clientMessage = clientMessageListener.mock.calls[0][0] as MessageEvent
    expect(clientMessage.type).toBe('message')
    expect(clientMessage.data).toEqual(new Blob(['hello world']))
  })
})
