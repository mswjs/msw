import { HttpHandler } from '#http/http-handler'
import { sse } from './index'

beforeAll(() => {
  vi.stubGlobal('EventSource', class EventSource {})
})

afterAll(() => {
  vi.unstubAllGlobals()
})

test('exposes the sse request handler', () => {
  expect(sse('/stream', () => {})).toBeInstanceOf(HttpHandler)
})
