// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

const service = ws.link('ws://example.com/*')

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('translates unhandled connection handler errors to WebSocket error events', async () => {
  const errorListener = vi.fn()
  const openListener = vi.fn()
  const connectionError = new Error('Connection error')

  server.use(
    service.addEventListener('connection', () => {
      throw connectionError
    }),
  )

  const socket = new WebSocket('ws://example.com/path')
  socket.onerror = errorListener
  socket.onopen = openListener

  await vi.waitFor(() => {
    expect(errorListener).toHaveBeenCalledTimes(1)

    const errorEvent = errorListener.mock.calls[0][0] as Event
    expect(errorEvent.type).toBe('error')
    expect((errorEvent as any).cause).toBe(connectionError)
  })

  // The connection should not have opened successfully.
  expect(openListener).not.toHaveBeenCalled()
})

it('translates unhandled async connection handler errors to WebSocket error events', async () => {
  const errorListener = vi.fn()
  const openListener = vi.fn()
  const connectionError = new Error('Async connection error')

  server.use(
    service.addEventListener('connection', async () => {
      await Promise.resolve()
      throw connectionError
    }),
  )

  const socket = new WebSocket('ws://example.com/path')
  socket.onerror = errorListener
  socket.onopen = openListener

  await vi.waitFor(() => {
    expect(errorListener).toHaveBeenCalledTimes(1)

    const errorEvent = errorListener.mock.calls[0][0] as Event
    expect(errorEvent.type).toBe('error')
    expect((errorEvent as any).cause).toBe(connectionError)
  })

  expect(openListener).not.toHaveBeenCalled()
})
