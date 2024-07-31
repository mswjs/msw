// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const server = setupServer()
const wsServer = new WebSocketServer()

const service = ws.link('ws://*')

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

it('intercepts outgoing client text message', async () => {
  const mockMessageListener = vi.fn()
  const realConnectionListener = vi.fn()

  server.use(
    service.on('connection', ({ client }) => {
      client.addEventListener('message', mockMessageListener)
    }),
  )
  wsServer.on('connection', realConnectionListener)

  const socket = new WebSocket(wsServer.url)
  socket.onopen = () => socket.send('hello')

  await vi.waitFor(() => {
    // Must intercept the outgoing client message event.
    expect(mockMessageListener).toHaveBeenCalledTimes(1)

    const messageEvent = mockMessageListener.mock.calls[0][0] as MessageEvent
    expect(messageEvent.type).toBe('message')
    expect(messageEvent.data).toBe('hello')
    expect(messageEvent.target).toBe(socket)

    // Must not connect to the actual server by default.
    expect(realConnectionListener).not.toHaveBeenCalled()
  })
})

it('intercepts outgoing client Blob message', async () => {
  const mockMessageListener = vi.fn()
  const realConnectionListener = vi.fn()

  server.use(
    service.on('connection', ({ client }) => {
      client.addEventListener('message', mockMessageListener)
    }),
  )
  wsServer.on('connection', realConnectionListener)

  const socket = new WebSocket(wsServer.url)
  socket.onopen = () => socket.send(new Blob(['hello']))

  await vi.waitFor(() => {
    expect(mockMessageListener).toHaveBeenCalledTimes(1)

    const messageEvent = mockMessageListener.mock.calls[0][0] as MessageEvent
    expect(messageEvent.type).toBe('message')
    expect(messageEvent.data.size).toBe(5)
    expect(messageEvent.target).toEqual(socket)

    // Must not connect to the actual server by default.
    expect(realConnectionListener).not.toHaveBeenCalled()
  })
})

it('intercepts outgoing client ArrayBuffer message', async () => {
  const mockMessageListener = vi.fn()
  const realConnectionListener = vi.fn()

  server.use(
    service.on('connection', ({ client }) => {
      client.addEventListener('message', mockMessageListener)
    }),
  )
  wsServer.on('connection', realConnectionListener)

  const socket = new WebSocket(wsServer.url)
  socket.binaryType = 'arraybuffer'
  socket.onopen = () => socket.send(new TextEncoder().encode('hello'))

  await vi.waitFor(() => {
    expect(mockMessageListener).toHaveBeenCalledTimes(1)

    const messageEvent = mockMessageListener.mock.calls[0][0] as MessageEvent
    expect(messageEvent.type).toBe('message')
    expect(messageEvent.data).toEqual(new TextEncoder().encode('hello'))
    expect(messageEvent.target).toEqual(socket)

    // Must not connect to the actual server by default.
    expect(realConnectionListener).not.toHaveBeenCalled()
  })
})
