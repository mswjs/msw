import { GraphQLHandler } from '../../handlers/GraphQLHandler'
import { HttpHandler } from '../../handlers/HttpHandler'
import { RequestHandler } from '../../handlers/RequestHandler'
import { WebSocketHandler } from '../../handlers/WebSocketHandler'
import { toRequestHandlersOnly } from './toRequestHandlersOnly'

it('returns true for HttpHandler', () => {
  expect(toRequestHandlersOnly(new HttpHandler('*', '*', () => {}))).toBe(true)
})

it('returns true for GraphQLHandler', () => {
  expect(
    toRequestHandlersOnly(new GraphQLHandler('all', '*', '*', () => {})),
  ).toBe(true)
})

it('returns true for a custom RequestHandler', () => {
  class MyHandler extends RequestHandler {
    constructor() {
      super({ info: { header: '*' }, resolver: () => {} })
    }
    predicate = () => false
    log() {}
  }

  expect(toRequestHandlersOnly(new MyHandler())).toBe(true)
})

it('returns false for a WebSocketHandler', () => {
  expect(toRequestHandlersOnly(new WebSocketHandler('*'))).toBe(false)
})

it('returns false for an arbitrary values', () => {
  expect(toRequestHandlersOnly(undefined)).toBe(false)
  expect(toRequestHandlersOnly(null)).toBe(false)
  expect(toRequestHandlersOnly({})).toBe(false)
  expect(toRequestHandlersOnly([])).toBe(false)
  expect(toRequestHandlersOnly(123)).toBe(false)
  expect(toRequestHandlersOnly('hello')).toBe(false)
})
