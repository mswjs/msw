/**
 * @vitest-environment node-websocket
 */
import { ws } from 'msw'
import { setupServer } from 'msw/node'

const api = ws.link('wss://example.com')
const server = setupServer(api.on('connection', () => {}))

afterAll(() => {
  server.close()
})

it('does not apply the interceptor until server.listen() is called', async () => {
  const raw = new WebSocket('wss://example.com')
  expect(raw.constructor.name).toBe('WebSocket')
  expect(raw).toBeInstanceOf(EventTarget)

  server.listen()

  const mocked = new WebSocket('wss://example.com')
  expect(mocked.constructor.name).not.toBe('WebSocket')
  expect(mocked).toBeInstanceOf(EventTarget)
})
