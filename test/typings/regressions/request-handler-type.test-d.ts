/**
 * @see https://github.com/mswjs/msw/discussions/498
 */
import {
  http,
  type HttpHandler,
  type RequestHandler,
  type AnyHandler,
} from 'msw'
import { ws, type WebSocketHandler } from 'msw/ws'
import { graphql, type GraphQLHandler } from 'msw/graphql'
import { setupServer } from 'msw/node'
import { setupWorker } from 'msw/browser'

const api = graphql.link('https://api.example.com/graphql')

test('handler types extend the AnyHandler type', () => {
  expectTypeOf<RequestHandler>().toExtend<AnyHandler>()
  expectTypeOf<HttpHandler>().toExtend<AnyHandler>()
  expectTypeOf<GraphQLHandler>().toExtend<AnyHandler>()
  expectTypeOf<WebSocketHandler>().toExtend<AnyHandler>()
})

test('http handlers extend the RequestHandler type', () => {
  const handlers = [http.get('/', () => {})]

  expectTypeOf<HttpHandler>().toExtend<RequestHandler>()
  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<HttpHandler>>()
})

test('graphql handlers extend the RequestHandler type', () => {
  const handlers = [api.query('GetUser', () => {})]

  expectTypeOf<GraphQLHandler>().toExtend<RequestHandler>()
  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<GraphQLHandler>>()
})

test('a list of http and graphql handlers extend the RequestHandler type', () => {
  const handlers = [http.get('/', () => {}), api.query('GetUser', () => {})]

  expectTypeOf(handlers).toExtend<Array<RequestHandler>>()
  expectTypeOf(handlers).toEqualTypeOf<Array<HttpHandler | GraphQLHandler>>()
})

test('websocket handler extends the WebSocketHandler type', () => {
  expectTypeOf([ws.link('/').addEventListener('connection', () => {})])
    .toEqualTypeOf<Array<WebSocketHandler>>
})

test('accepts different handler types in setupWorker', () => {
  expectTypeOf(setupWorker).parameters.toEqualTypeOf<Array<AnyHandler>>()
  expectTypeOf(setupWorker).parameters.toExtend<
    Array<RequestHandler | WebSocketHandler>
  >()
})

test('accepts narrower handler types in setupWorker', () => {
  setupWorker(...([] as Array<HttpHandler>))
  setupWorker(...([] as Array<GraphQLHandler>))
  setupWorker(...([] as Array<WebSocketHandler>))
})

test('accepts different handler types in setupServer', () => {
  expectTypeOf(setupServer).parameters.toEqualTypeOf<Array<AnyHandler>>()
  expectTypeOf(setupServer).parameters.toExtend<
    Array<RequestHandler | WebSocketHandler>
  >()
})

test('accepts narrower handler types in setupServer', () => {
  setupServer(...([] as Array<HttpHandler>))
  setupServer(...([] as Array<GraphQLHandler>))
  setupServer(...([] as Array<WebSocketHandler>))
})
