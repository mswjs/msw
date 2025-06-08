import { it, expectTypeOf } from 'vitest'
import {
  WebSocketData,
  WebSocketLink,
  WebSocketHandlerConnection,
  ws,
} from 'msw'
import { WebSocketClientConnectionProtocol } from '@mswjs/interceptors/WebSocket'

it('supports URL as the link argument', () => {
  expectTypeOf(ws.link('ws://localhost')).toEqualTypeOf<WebSocketLink>()
})

it('supports RegExp as the link argument', () => {
  expectTypeOf(ws.link(/\/ws$/)).toEqualTypeOf<WebSocketLink>()
})

it('exposes root-level link APIs', () => {
  const link = ws.link('ws://localhost')

  expectTypeOf(link.addEventListener).toBeFunction()
  expectTypeOf(link.broadcast).toBeFunction()
  expectTypeOf(link.broadcastExcept).toBeFunction()
  expectTypeOf(link.clients).toEqualTypeOf<
    Set<WebSocketClientConnectionProtocol>
  >()
})

it('supports "connection" event listener', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', (connection) => {
    expectTypeOf(connection).toEqualTypeOf<WebSocketHandlerConnection>()
  })
})

it('errors on arbitrary event names passed to the link', () => {
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

it('exposes root-level "client" APIs', () => {
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

it('supports "message" event listener on the client', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    client.addEventListener('message', (event) => {
      expectTypeOf(event).toEqualTypeOf<MessageEvent<WebSocketData>>()
    })
  })
})

it('supports "close" event listener on the client', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ client }) => {
    client.addEventListener('close', (event) => {
      expectTypeOf(event).toMatchTypeOf<CloseEvent>()
    })
  })
})

it('errors on arbitrary event names passed to the client', () => {
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

it('exposes root-level "server" APIs', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    expectTypeOf(server.connect).toEqualTypeOf<() => void>()
    expectTypeOf(server.addEventListener).toBeFunction()
    expectTypeOf(server.send).toBeFunction()
    expectTypeOf(server.removeEventListener).toBeFunction()
    expectTypeOf(server.close).toBeFunction()
  })
})

it('supports "message" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('message', (event) => {
      expectTypeOf(event).toEqualTypeOf<MessageEvent<WebSocketData>>()
    })
  })
})

it('supports "open" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('open', (event) => {
      expectTypeOf(event).toMatchTypeOf<Event>()
    })
  })
})

it('supports "close" event listener on the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener('close', (event) => {
      expectTypeOf(event).toMatchTypeOf<CloseEvent>()
    })
  })
})

it('errors on arbitrary event names passed to the server', () => {
  const link = ws.link('ws://localhost')

  link.addEventListener('connection', ({ server }) => {
    server.addEventListener(
      // @ts-expect-error Unknown event name "abc".
      'abc',
      () => {},
    )
  })
})
