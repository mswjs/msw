import nodeHttp from 'node:http'
import { setupServer } from './setup-server'
import { http } from '../http/http'
import { ws } from '../ws/ws'
import { waitForClientRequest } from '../../test/support/utils'

it('intercepts a request immediately after adding the first request handler', async ({
  onTestFinished,
}) => {
  const originalFetch = globalThis.fetch
  const originalWebSocket = globalThis.WebSocket

  const server = setupServer()
  onTestFinished(() => server.close())

  server.listen()
  expect(globalThis.fetch).toBe(originalFetch)
  expect(globalThis.WebSocket).toBe(originalWebSocket)

  server.use(
    http.get('http://example.com/resource', () => new Response('mocked')),
  )
  const request = nodeHttp.get('http://example.com/resource')
  const { response, responseText } = await waitForClientRequest(request)

  expect(response.statusCode).toBe(200)
  expect(responseText).toBe('mocked')
  expect(globalThis.WebSocket).toBe(originalWebSocket)

  server.resetHandlers()

  expect(globalThis.fetch).toBe(originalFetch)
})

it('activates both Node.js upgrade and WebSocket sources for a link handler', ({
  onTestFinished,
}) => {
  const originalFetch = globalThis.fetch
  const originalWebSocket = globalThis.WebSocket

  const server = setupServer()
  onTestFinished(() => server.close())

  server.listen()
  server.use(
    ws.link('wss://example.com').addEventListener('connection', () => {}),
  )

  expect(globalThis.fetch).not.toBe(originalFetch)
  expect(globalThis.WebSocket).not.toBe(originalWebSocket)

  server.resetHandlers()

  expect(globalThis.fetch).toBe(originalFetch)
  expect(globalThis.WebSocket).toBe(originalWebSocket)
})
