import { setupServer } from 'msw/node'
import { setupWorker } from 'msw/browser'
import {
  type HttpNetworkFrameEventMap,
  type WebSocketNetworkFrameEventMap,
} from 'msw/experimental'

it('annotates life cycle event types (node)', () => {
  expectTypeOf(setupServer().events.on)
    .parameter(0)
    .toEqualTypeOf<
      '*' | keyof HttpNetworkFrameEventMap | keyof WebSocketNetworkFrameEventMap
    >()

  expectTypeOf(setupServer().events.removeListener)
    .parameter(0)
    .toEqualTypeOf<
      '*' | keyof HttpNetworkFrameEventMap | keyof WebSocketNetworkFrameEventMap
    >()

  expectTypeOf(setupServer().events.removeAllListeners)
    .parameter(0)
    .toEqualTypeOf<
      | '*'
      | keyof HttpNetworkFrameEventMap
      | keyof WebSocketNetworkFrameEventMap
      | undefined
    >()
})

it('annotates life cycle event types (browser)', () => {
  expectTypeOf(setupWorker().events.on)
    .parameter(0)
    .toEqualTypeOf<
      '*' | keyof HttpNetworkFrameEventMap | keyof WebSocketNetworkFrameEventMap
    >()

  expectTypeOf(setupWorker().events.removeListener)
    .parameter(0)
    .toEqualTypeOf<
      '*' | keyof HttpNetworkFrameEventMap | keyof WebSocketNetworkFrameEventMap
    >()

  expectTypeOf(setupWorker().events.removeAllListeners)
    .parameter(0)
    .toEqualTypeOf<
      | '*'
      | keyof HttpNetworkFrameEventMap
      | keyof WebSocketNetworkFrameEventMap
      | undefined
    >()
})

it('annotates event listener argument (node)', () => {
  const server = setupServer()
  server.events.on('request:start', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  server.events.on('request:match', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  server.events.on('request:unhandled', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  server.events.on('request:end', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })

  server.events.on('response:bypass', (args) => {
    expectTypeOf(args).toExtend<{
      request: Request
      requestId: string
      response: Response
    }>()
  })
  server.events.on('response:mocked', (args) => {
    expectTypeOf(args).toExtend<{
      request: Request
      requestId: string
      response: Response
    }>()
  })
})

it('annotates event listener argument (browser)', () => {
  const worker = setupWorker()

  worker.events.on('request:start', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  worker.events.on('request:match', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  worker.events.on('request:unhandled', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })
  worker.events.on('request:end', (args) => {
    expectTypeOf(args).toExtend<{ request: Request; requestId: string }>()
  })

  worker.events.on('response:bypass', (args) => {
    expectTypeOf(args).toExtend<{
      request: Request
      requestId: string
      response: Response
    }>()
  })
  worker.events.on('response:mocked', (args) => {
    expectTypeOf(args).toExtend<{
      request: Request
      requestId: string
      response: Response
    }>()
  })
})
