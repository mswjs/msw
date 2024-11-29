// @vitest-environment node-websocket
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer()

afterEach(() => {
  server.close()
})

it('patches WebSocket class even if no event handlers were defined', () => {
  server.listen()

  const raw = new WebSocket('wss://example.com')
  expect(raw.constructor.name).toBe('WebSocketOverride')
  expect(raw).toBeInstanceOf(EventTarget)
})

it('does not patch WebSocket class until server.listen() is called', () => {
  const api = ws.link('wss://example.com')
  server.use(api.addEventListener('connection', () => {}))

  const raw = new WebSocket('wss://example.com')
  expect(raw.constructor.name).toBe('WebSocket')
  expect(raw).toBeInstanceOf(EventTarget)

  server.listen()

  const mocked = new WebSocket('wss://example.com')
  expect(mocked.constructor.name).not.toBe('WebSocket')
  expect(mocked).toBeInstanceOf(EventTarget)
})
