import { ws } from 'msw/ws'
import { setupServer } from 'msw/node'

const server = setupServer()

afterEach(() => {
  server.close()
  server.resetHandlers()
})

it('leaves WebSocket unpatched when no event handlers are registered', () => {
  const originalWebSocket = globalThis.WebSocket
  server.listen()
  expect(globalThis.WebSocket).toBe(originalWebSocket)
})

it('does not patch WebSocket class until server.listen() is called', () => {
  const originalWebSocket = globalThis.WebSocket
  const api = ws.link('wss://example.com')
  server.use(api.addEventListener('connection', () => {}))

  expect(globalThis.WebSocket).toBe(originalWebSocket)

  server.listen()

  expect(globalThis.WebSocket).not.toBe(originalWebSocket)
})
