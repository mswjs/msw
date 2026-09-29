// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { HttpResponse, http } from 'msw'
import { setupServer, type SetupServer } from 'msw/node'
import { createProxyServer, proxiedGet } from '../../../support/proxy-server'

/**
 * @note "CONNECT" requests establish a tunnel through a proxy.
 * There is no `http.connect()` handler yet, so MSW must ignore them:
 * pass them through without erroring, warning, or matching HTTP handlers.
 */

function listen(options?: Parameters<SetupServer['listen']>[0]): SetupServer {
  const server = setupServer()
  server.listen(options)
  onTestFinished(() => server.close())
  return server
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => void 0)
  vi.spyOn(console, 'warn').mockImplementation(() => void 0)
})

afterEach(() => {
  vi.restoreAllMocks()
})

test('passes through an unhandled CONNECT request under the "error" strategy', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')
  const server = listen({ onUnhandledFrame: 'error' })
  server.use(
    http.get(targetUrl.href, () => {
      return HttpResponse.text('mocked')
    }),
  )

  const { response } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect(response.statusCode).toBe(200)
  expect(console.error).not.toHaveBeenCalled()
})

test('passes through an unhandled CONNECT request under the "warn" strategy', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')
  const server = listen({ onUnhandledFrame: 'warn' })
  server.use(
    http.get(targetUrl.href, () => {
      return HttpResponse.text('mocked')
    }),
  )

  const { response } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect(response.statusCode).toBe(200)
  expect(console.warn).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()
})

test('does not call the custom "onUnhandledFrame" callback for a CONNECT request', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')
  const onUnhandledFrame = vi.fn()
  const server = listen({ onUnhandledFrame })
  server.use(
    http.get(targetUrl.href, () => {
      return HttpResponse.text('mocked')
    }),
  )

  const { response } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect(response.statusCode).toBe(200)
  expect(onUnhandledFrame).not.toHaveBeenCalled()
})

/**
 * @todo Decide whether `http.all()` matches CONNECT requests
 * once `http.connect()` is supported.
 */
test('does not match a CONNECT request against "http.all()"', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')
  const seenMethods: Array<string> = []
  const server = listen({ onUnhandledFrame: 'error' })
  server.use(
    http.all('*', ({ request }) => {
      seenMethods.push(request.method)
    }),
  )

  const { response, responseText } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect(response.statusCode).toBe(200)
  expect(responseText).toBe('original')
  expect(seenMethods).not.toContain('CONNECT')
})

test('emits life-cycle events for a CONNECT request without marking it unhandled', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')
  const connectEvents: Array<[eventName: string, url: string]> = []
  const unhandledExceptionListener = vi.fn()
  const server = listen({ onUnhandledFrame: 'error' })
  server.use(
    http.get(targetUrl.href, () => {
      return HttpResponse.text('mocked')
    }),
  )

  const trackConnectEvent = (
    eventName: 'request:start' | 'request:unhandled' | 'request:end',
  ) => {
    server.events.on(eventName, ({ request }) => {
      if (request.method === 'CONNECT') {
        connectEvents.push([eventName, request.url])
      }
    })
  }
  trackConnectEvent('request:start')
  trackConnectEvent('request:unhandled')
  trackConnectEvent('request:end')
  server.events.on('unhandledException', unhandledExceptionListener)

  const { response } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect(response.statusCode).toBe(200)
  expect(connectEvents).toEqual([
    ['request:start', targetUrl.host],
    ['request:end', targetUrl.host],
  ])
  expect(unhandledExceptionListener).not.toHaveBeenCalled()
  expect(console.error).not.toHaveBeenCalled()
})
