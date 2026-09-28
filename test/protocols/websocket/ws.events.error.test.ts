import { ws } from 'msw/ws'
import type { WebSocketNetworkFrameEventMap } from 'msw/experimental'
import { test, expect } from '../../setup/vitest-helpers'

type WebSocketErrorEvent = WebSocketNetworkFrameEventMap['websocket:error']

test('emits "websocket:error" when the event handler throws', async ({
  network,
  spyOnConsole,
}) => {
  spyOnConsole()

  const errorListener = vi.fn<(event: WebSocketErrorEvent) => void>()
  network.events.on('websocket:error', errorListener)

  const service = ws.link('ws://localhost/chat')
  network.use(
    service.addEventListener('connection', () => {
      throw new Error('Handler exception')
    }),
  )

  const socket = new WebSocket('ws://localhost/chat', ['chat'])
  const socketErrorListener = vi.fn()
  socket.onerror = socketErrorListener
  socket.onopen = () => {
    expect.fail('Must not open the WebSocket connection')
  }

  await expect.poll(() => socketErrorListener).toHaveBeenCalledOnce()
  await expect.poll(() => errorListener).toHaveBeenCalledOnce()

  const [event] = errorListener.mock.calls[0]
  expect(event.type).toBe('websocket:error')
  expect(event.url).toBeInstanceOf(URL)
  expect(event.url.href).toBe('ws://localhost/chat')
  expect(event.protocols).toEqual(['chat'])
})

test('emits "websocket:error" when connecting to a non-existing server', async ({
  network,
}) => {
  const errorListener = vi.fn<(event: WebSocketErrorEvent) => void>()
  network.events.on('websocket:error', errorListener)

  const serverUrl = 'ws://non-existing-websocket-address.com'
  const service = ws.link(serverUrl)
  network.use(
    service.addEventListener('connection', ({ server }) => {
      server.connect()
    }),
  )

  const socket = new WebSocket(serverUrl)
  const socketErrorListener = vi.fn()
  socket.onerror = socketErrorListener

  await expect.poll(() => socketErrorListener).toHaveBeenCalledOnce()
  await expect.poll(() => errorListener).toHaveBeenCalledOnce()

  const [event] = errorListener.mock.calls[0]
  expect(event.type).toBe('websocket:error')
  expect(event.url.href).toBe(`${serverUrl}/`)
  expect(event.protocols).toBeUndefined()
})

test('does not emit "websocket:error" on a clean connection closure', async ({
  network,
}) => {
  const errorListener = vi.fn<(event: WebSocketErrorEvent) => void>()
  network.events.on('websocket:error', errorListener)

  const service = ws.link('ws://localhost/chat')
  network.use(
    service.addEventListener('connection', ({ client }) => {
      client.close()
    }),
  )

  const socket = new WebSocket('ws://localhost/chat')
  const closeListener = vi.fn()
  socket.onclose = closeListener

  await expect.poll(() => closeListener).toHaveBeenCalledOnce()

  expect(errorListener).not.toHaveBeenCalled()
})
