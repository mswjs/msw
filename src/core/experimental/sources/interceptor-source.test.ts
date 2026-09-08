import { FetchInterceptor } from '@mswjs/interceptors/fetch'
import { WebSocketInterceptor } from '@mswjs/interceptors/WebSocket'
import { defineNetwork, NetworkReadyState } from '../define-network'
import { InterceptorSource } from './interceptor-source'
import { http } from '../../../http/http'
import { ws } from '../../../ws/ws'

it('leaves unused transports unpatched and intercepts fetch immediately after registration', async ({
  onTestFinished,
}) => {
  const originalFetch = globalThis.fetch
  const originalWebSocket = globalThis.WebSocket
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        interceptors: [new FetchInterceptor()],
        lazy: { enabled: true, handlers: ['request'] },
      }),
      new InterceptorSource({
        // @ts-expect-error WebSocketInterceptor uses a separate browser Interceptor declaration.
        interceptors: [new WebSocketInterceptor()],
        lazy: { enabled: true, handlers: ['websocket'] },
      }),
    ],
    context: { quiet: true },
    onUnhandledFrame: 'bypass',
  })
  onTestFinished(() => {
    if (network.readyState === NetworkReadyState.ENABLED) {
      network.disable()
    }
  })
  network.enable()
  expect(globalThis.fetch).toBe(originalFetch)
  expect(globalThis.WebSocket).toBe(originalWebSocket)

  const resolver = vi.fn(() => new Response('mocked'))
  const handler = http.get('https://example.com/resource', resolver)
  network.use(handler)
  expect(globalThis.fetch).not.toBe(originalFetch)
  expect(globalThis.WebSocket).toBe(originalWebSocket)
  const response = await fetch('https://example.com/resource')
  await expect(response.text()).resolves.toBe('mocked')

  network.resetHandlers()
  expect(globalThis.fetch).toBe(originalFetch)
  const originalResponse = await fetch('data:text/plain,original')
  await expect(originalResponse.text()).resolves.toBe('original')

  network.use(handler)
  const nextResponse = await fetch('https://example.com/resource')
  await expect(nextResponse.text()).resolves.toBe('mocked')
  expect(resolver).toHaveBeenCalledTimes(2)

  network.disable()
  expect(globalThis.fetch).toBe(originalFetch)
  expect(globalThis.WebSocket).toBe(originalWebSocket)
})

it('patches WebSocket only while a connection handler is registered', async ({
  onTestFinished,
}) => {
  const originalWebSocket = globalThis.WebSocket
  const network = defineNetwork({
    sources: [
      new InterceptorSource({
        // @ts-expect-error WebSocketInterceptor uses a separate browser Interceptor declaration.
        interceptors: [new WebSocketInterceptor()],
        lazy: { enabled: true, handlers: ['websocket'] },
      }),
    ],
    context: { quiet: true },
  })
  onTestFinished(() => {
    if (network.readyState === NetworkReadyState.ENABLED) {
      network.disable()
    }
  })
  network.enable()
  expect(globalThis.WebSocket).toBe(originalWebSocket)

  const handler = ws
    .link('wss://example.com')
    .addEventListener('connection', ({ client }) => {
      client.send('mocked')
    })
  network.use(handler)
  expect(globalThis.WebSocket).not.toBe(originalWebSocket)
  const socket = new WebSocket('wss://example.com')
  onTestFinished(() => {
    socket.close()
  })
  const message = new Promise<MessageEvent>((resolve, reject) => {
    socket.addEventListener('message', resolve, { once: true })
    socket.addEventListener('error', reject, { once: true })
  })
  await expect(message).resolves.toMatchObject({ data: 'mocked' })
  socket.close()

  network.resetHandlers()
  expect(globalThis.WebSocket).toBe(originalWebSocket)
  network.use(handler)
  expect(globalThis.WebSocket).not.toBe(originalWebSocket)
  network.disable()
  expect(globalThis.WebSocket).toBe(originalWebSocket)
})
