/**
 * @see https://github.com/mswjs/msw/discussions/498
 */
import {
  http,
  graphql,
  ws,
  type HttpHandler,
  type RequestHandler,
  type AnyHandler,
  type WebSocketHandler,
  type GraphQLHandler,
} from 'msw'
import { setupServer } from 'msw/node'
import { setupWorker } from 'msw/browser'

it('handler types extend the AnyHandler type', () => {
  expectTypeOf<RequestHandler>().toExtend<AnyHandler>()
  expectTypeOf<HttpHandler>().toExtend<AnyHandler>()
  expectTypeOf<GraphQLHandler>().toExtend<AnyHandler>()
  expectTypeOf<WebSocketHandler>().toExtend<AnyHandler>()
})

it('http handlers extend the RequestHandler type', () => {
  const handlers = [http.get('/', () => {})]

  expectTypeOf<HttpHandler>().toExtend<RequestHandler>()
  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<HttpHandler>>()
})

it('graphql handlers extend the RequestHandler type', () => {
  const handlers = [graphql.query('GetUser', () => {})]

  expectTypeOf<GraphQLHandler>().toExtend<RequestHandler>()
  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<GraphQLHandler>>()
})

it('a list of http and graphql handlers extend the RequestHandler type', () => {
  const handlers = [http.get('/', () => {}), graphql.query('GetUser', () => {})]

  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<HttpHandler | GraphQLHandler>>()
})

it('websocket handler extends the WebSocketHandler type', () => {
  expectTypeOf([ws.link('/').addEventListener('connection', () => {})])
    .toEqualTypeOf<Array<WebSocketHandler>>
})

it('accepts different handler types in setupWorker', () => {
  expectTypeOf(setupWorker).parameters.toEqualTypeOf<Array<AnyHandler>>()
  expectTypeOf(setupWorker).parameters.toExtend<
    Array<RequestHandler | WebSocketHandler>
  >()
})

it('accepts narrower handler types in setupWorker', () => {
  setupWorker(...([] as Array<HttpHandler>))
  setupWorker(...([] as Array<GraphQLHandler>))
  setupWorker(...([] as Array<WebSocketHandler>))
})

it('accepts different handler types in setupServer', () => {
  expectTypeOf(setupServer).parameters.toEqualTypeOf<Array<AnyHandler>>()
  expectTypeOf(setupServer).parameters.toExtend<
    Array<RequestHandler | WebSocketHandler>
  >()
})

it('accepts narrower handler types in setupServer', () => {
  setupServer(...([] as Array<HttpHandler>))
  setupServer(...([] as Array<GraphQLHandler>))
  setupServer(...([] as Array<WebSocketHandler>))
})
