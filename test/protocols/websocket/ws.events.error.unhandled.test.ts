import type { WebSocketNetworkFrameEventMap } from 'msw/experimental'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

type WebSocketErrorEvent = WebSocketNetworkFrameEventMap['websocket:error']

const test = defineNetwork({
  serverOptions: { onUnhandledRequest: 'error' },
  workerOptions: { onUnhandledRequest: 'error' },
})

test('emits "websocket:error" on an unhandled connection with the "error" strategy', async ({
  network,
  spyOnConsole,
}) => {
  spyOnConsole()

  const errorListener = vi.fn<(event: WebSocketErrorEvent) => void>()
  network.events.on('websocket:error', errorListener)

  const socket = new WebSocket('ws://localhost/chat')
  const socketErrorListener = vi.fn()
  socket.onerror = socketErrorListener

  await expect.poll(() => socketErrorListener).toHaveBeenCalledOnce()
  await expect.poll(() => errorListener).toHaveBeenCalledOnce()

  const [event] = errorListener.mock.calls[0]
  expect(event.type).toBe('websocket:error')
  expect(event.url.href).toBe('ws://localhost/chat')
  expect(event.error).toBeInstanceOf(Error)
  expect(event.error).toEqual(
    expect.objectContaining({
      message:
        '[MSW] Cannot bypass a request when using the "error" strategy for the "onUnhandledRequest" option.',
    }),
  )
})
