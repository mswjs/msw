import type { RequestHandler } from 'msw'
import type { WebSocketExtension, WebSocketHandler } from 'msw/ws'
import { InMemoryHandlersController } from 'msw/experimental'

test('narrows the handlers to the given kind', () => {
  const controller = new InMemoryHandlersController([])

  expectTypeOf(controller.getHandlersByKind('request')).toEqualTypeOf<
    Array<RequestHandler>
  >()

  expectTypeOf(controller.getHandlersByKind('websocket')).toEqualTypeOf<
    Array<WebSocketHandler<WebSocketExtension<unknown, unknown>>>
  >()
})

test('rejects unknown handler kinds', () => {
  const controller = new InMemoryHandlersController([])

  // @ts-expect-error Unknown handler kind.
  controller.getHandlersByKind('unknown')
})
