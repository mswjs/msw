// @vitest-environment node-websocket
import { ws } from './ws'
import { createTestWebSocketConnection } from '../../test/support/ws-test-utils'

it('exports the "link()" method', () => {
  expect(ws).toHaveProperty('link')
  expect(ws.link).toBeInstanceOf(Function)
})

it('throws an error when calling "ws.link()" without a URL argument', () => {
  expect(() =>
    // @ts-expect-error Intentionally invalid call.
    ws.link(),
  ).toThrow('Expected a WebSocket server URL but got undefined')
})

it('throws an error when given a non-path argument to "ws.link()"', () => {
  expect(() =>
    // @ts-expect-error Intentionally invalid argument.
    ws.link(2),
  ).toThrow('Expected a WebSocket server URL to be a valid path but got number')
})

it('supports transforming the connection in the link()', async () => {
  const service = ws.link('ws://localhost', {
    transform(connection) {
      return {
        ...connection,
        params: {
          roomId: 'room-1',
        },
      }
    },
  })
  const listener = vi.fn()

  const handler = service.addEventListener('connection', listener)

  const result = await handler.run(
    createTestWebSocketConnection('ws://localhost'),
  )

  expect(result).toEqual(
    expect.objectContaining({
      params: {
        roomId: 'room-1',
      },
    }),
  )
  expect(listener).toHaveBeenCalledOnce()
  expect(listener).toHaveBeenCalledWith(
    expect.objectContaining({
      params: {
        roomId: 'room-1',
      },
    }),
  )
})
