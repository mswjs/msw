import { test, expectTypeOf } from 'vitest'
import type {
  WebSocketData,
  WebSocketLink,
  WebSocketHandlerConnection,
} from 'msw/ws'
import { ws, WebSocketExtension } from 'msw/ws'
import type { WebSocketClientHandle } from '@mswjs/interceptors/WebSocket'

test('supports URL as the link argument', () => {
  expectTypeOf(ws.link('ws://localhost')).toEqualTypeOf<WebSocketLink>()
})

test('supports RegExp as the link argument', () => {
  expectTypeOf(ws.link(/\/ws$/)).toEqualTypeOf<WebSocketLink>()
})

test('exposes root-level link APIs', () => {
  const link = ws.link('ws://localhost')

  expectTypeOf(link.addEventListener).toBeFunction()
  expectTypeOf(link.broadcast).toBeFunction()
  expectTypeOf(link.broadcastExcept).toBeFunction()
  expectTypeOf(link.clients).toEqualTypeOf<Set<WebSocketClientHandle>>()
})

test('supports "connection" event listener', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', (connection) => {
    /**
     * @note The listener receives a `WebSocketConnectionEvent` that
     * implements `WebSocketHandlerConnection`, exposing the connection
     * properties directly on the event.
     */
    expectTypeOf(connection).toMatchTypeOf<WebSocketHandlerConnection>()
  })
})

test('errors on arbitrary event names passed to the link', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener(
    // @ts-expect-error Unknown event name "abc".
    'abc',
    () => {},
  )
})

/**
 * Client API.
 */

test('exposes root-level "client" APIs', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    expectTypeOf(client.id).toBeString()
    expectTypeOf(client.url).toEqualTypeOf<URL>()

    expectTypeOf(client.addEventListener).toBeFunction()
    expectTypeOf(client.send).toBeFunction()
    expectTypeOf(client.removeEventListener).toBeFunction()
    expectTypeOf(client.close).toBeFunction()
  })
})

test('supports "message" event listener on the client', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      expectTypeOf(event).toEqualTypeOf<MessageEvent<WebSocketData>>()
    })
  })
})

test('supports "close" event listener on the client', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    client.addEventListener('close', (event) => {
      expectTypeOf(event).toMatchTypeOf<CloseEvent>()
    })
  })
})

test('errors on arbitrary event names passed to the client', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    client.addEventListener(
      // @ts-expect-error Unknown event name "abc".
      'abc',
      () => {},
    )
  })
})

/**
 * Server API.
 */

test('exposes root-level "server" APIs', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    expectTypeOf(server.connect).toEqualTypeOf<() => void>()
    expectTypeOf(server.addEventListener).toBeFunction()
    expectTypeOf(server.send).toBeFunction()
    expectTypeOf(server.removeEventListener).toBeFunction()
    expectTypeOf(server.close).toBeFunction()
  })
})

test('supports "message" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('message', (event) => {
      expectTypeOf(event).toEqualTypeOf<MessageEvent<WebSocketData>>()
    })
  })
})

test('supports "open" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('open', (event) => {
      expectTypeOf(event).toMatchTypeOf<Event>()
    })
  })
})

test('supports "close" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('close', (event) => {
      expectTypeOf(event).toMatchTypeOf<CloseEvent>()
    })
  })
})

test('errors on arbitrary event names passed to the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener(
      // @ts-expect-error Unknown event name "abc".
      'abc',
      () => {},
    )
  })
})

test('keeps a union message type of an extension intact', () => {
  type Message = { event: string } | { type: 'ack'; id: number }

  class Acknowledging extends WebSocketExtension<Message, { rooms: string }> {
    public encode(message: Message): string {
      return JSON.stringify(message)
    }

    public decode(data: WebSocketData): Message | undefined {
      return typeof data === 'string' ? JSON.parse(data) : undefined
    }
  }

  const api = ws.link('ws://localhost', { extensions: [new Acknowledging()] })

  api.broadcast({ type: 'ack', id: 1 })
  api.addEventListener('connection', ({ client, rooms }) => {
    expectTypeOf(rooms).toEqualTypeOf<string>()
    client.send({ event: 'hello' })
    client.send({ type: 'ack', id: 1 })
    client.addEventListener('message', (event) => {
      expectTypeOf(event.data).toEqualTypeOf<Message>()
    })
  })
})
