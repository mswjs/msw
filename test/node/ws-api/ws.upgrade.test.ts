// @vitest-environment node
import { ws } from 'msw'
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

it('intercepts a WebSocket connection via an HTTP request upgrade', async () => {
  const api = ws.link('wss://localhost/ws')

  const connectionListener = vi.fn()
  server.use(api.addEventListener('connection', connectionListener))

  const upgradeResponse = await fetch('https://localhost/ws', {
    headers: {
      upgrade: 'websocket',
      connection: 'upgrade',
      'sec-websocket-key': 'abc-123',
    },
  })

  expect.soft(upgradeResponse.status).toBe(101)
  expect.soft(upgradeResponse.headers.get('upgrade')).toBe('websocket')
  expect.soft(upgradeResponse.headers.get('connection')).toBe('upgrade')
  expect
    .soft(upgradeResponse.headers.get('sec-websocket-accept'))
    .toBe('apA7rfK383HiPlWh1+EOR3vC9ww=')

  await expect
    .poll(() => connectionListener)
    .toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        client: expect.objectContaining({
          socket: expect.objectContaining({
            url: 'wss://localhost/ws',
          }),
        }),
      }),
    )
})
