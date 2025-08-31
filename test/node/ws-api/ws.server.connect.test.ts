// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'
import { WebSocketServer } from '../../support/WebSocketServer'

const service = ws.link('ws://*')
const originalServer = new WebSocketServer()

const server = setupServer()

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

it('does not connect to the actual server by default', async () => {
  const serverConnectionListener = vi.fn()
  const mockConnectionListener = vi.fn()

  originalServer.once('connection', serverConnectionListener)
  server.use(service.addEventListener('connection', mockConnectionListener))

  new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(mockConnectionListener).toHaveBeenCalledTimes(1)
    expect(serverConnectionListener).not.toHaveBeenCalled()
  })
})

it('connects to the actual server after calling "server.connect()"', async () => {
  const serverConnectionListener = vi.fn()
  const mockConnectionListener = vi.fn()

  originalServer.once('connection', serverConnectionListener)

  server.use(
    service.addEventListener('connection', ({ server }) => {
      mockConnectionListener()
      server.connect()
    }),
  )

  new WebSocket(originalServer.url)

  await vi.waitFor(() => {
    expect(mockConnectionListener).toHaveBeenCalledTimes(1)
    expect(serverConnectionListener).toHaveBeenCalledTimes(1)
  })
})

it('forwards incoming server events to the client once connected', async () => {
  originalServer.once('connection', (client) => client.send('hello'))

  server.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
    }),
  )

  const messageListener = vi.fn()
  const ws = new WebSocket(originalServer.url)
  ws.onmessage = (event) => messageListener(event.data)

  await vi.waitFor(() => {
    expect(messageListener).toHaveBeenNthCalledWith(1, 'hello')
    expect(messageListener).toHaveBeenCalledTimes(1)
  })
})

it('throws an error when connecting to a non-existing server', async () => {
  server.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
    }),
  )

  const errorListener = vi.fn()
  const ws = new WebSocket('ws://localhost:9876')
  ws.onerror = errorListener

  await vi.waitFor(() => {
    expect(errorListener).toHaveBeenCalledTimes(1)
  })
})
