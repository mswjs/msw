import { ws } from 'msw/ws'
import { setupServer } from 'msw/node'
import { WebSocketNetworkFrame } from 'msw/experimental'

const service = ws.link('wss://localhost:4321')
const server = setupServer()

const onUnhandledFrame = vi.fn()

beforeAll(() => {
  server.listen({ onUnhandledFrame })
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  server.resetHandlers()
  vi.resetAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

test('calls a custom callback on an unhandled WebSocket connection', async () => {
  const socket = new WebSocket('wss://localhost:4321')

  await vi.waitFor(() => {
    return new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
  })

  expect(onUnhandledFrame).toHaveBeenCalledOnce()

  const [{ frame, defaults }] = onUnhandledFrame.mock.calls[0]
  expect(frame).toBeInstanceOf(WebSocketNetworkFrame)
  expect(frame.data.connection.client.url.href).toBe('wss://localhost:4321/')
  expect(defaults).toEqual({
    warn: expect.any(Function),
    error: expect.any(Function),
  })
})

test('does not call a custom callback for a handled WebSocket connection', async () => {
  server.use(service.addEventListener('connection', () => {}))

  const socket = new WebSocket('wss://localhost:4321')

  await vi.waitFor(() => {
    return new Promise((resolve, reject) => {
      socket.onopen = resolve
      socket.onerror = reject
    })
  })

  expect(onUnhandledFrame).not.toHaveBeenCalled()
})
