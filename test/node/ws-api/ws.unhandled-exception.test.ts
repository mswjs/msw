// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()
const service = ws.link('ws://*')

beforeAll(() => {
  server.listen()
  vi.spyOn(console, 'error').mockImplementation(() => void 0)
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(() => {
  server.close()
  vi.restoreAllMocks()
})

it('dispatches a WebSocket error event on handler exception', async () => {
  server.use(
    service.addEventListener('connection', () => {
      throw new Error('Handler exception')
    }),
  )

  const socket = new WebSocket('ws://localhost:3000')

  const closeListener = vi.fn()
  const errorListener = vi.fn()
  socket.onclose = closeListener
  socket.onerror = errorListener
  socket.onopen = () => {
    expect.fail('Must not open the WebSocket connection')
  }

  await expect.poll(() => errorListener).toHaveBeenCalledOnce()
  expect(closeListener).toHaveBeenCalledOnce()
  expect(closeListener).toHaveBeenCalledWith(
    expect.objectContaining({
      code: 1011,
      reason: 'Handler exception',
    }),
  )
  expect(socket.readyState).toBe(WebSocket.CLOSED)

  expect(console.error, 'Prints the error for the user').toHaveBeenCalledWith(
    new Error('Handler exception'),
  )
})
