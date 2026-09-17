// @vitest-environment node
import { ws } from 'msw/ws'
import { setupServer } from 'msw/node'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

it('rejects a WebSocket upgrade via an HTTP request like Node.js', async () => {
  const api = ws.link('wss://localhost/ws')

  const connectionListener = vi.fn()
  server.use(api.addEventListener('connection', connectionListener))

  // Node.js `fetch` (Undici) does not support protocol upgrades
  // and rejects any request that receives a "101 Switching Protocols"
  // response. Intercepted upgrade requests must behave the same.
  const fetchError = await fetch('https://localhost/ws', {
    headers: {
      upgrade: 'websocket',
      connection: 'upgrade',
      'sec-websocket-key': 'abc-123',
    },
  }).then(
    () => {
      expect.fail('The upgrade request must not succeed')
    },
    (error) => {
      return error
    },
  )

  expect.soft(fetchError).toBeInstanceOf(TypeError)
  expect.soft(fetchError.message).toBe('fetch failed')

  expect(connectionListener).not.toHaveBeenCalled()
})
