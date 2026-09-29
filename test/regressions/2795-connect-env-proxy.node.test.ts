/**
 * @see https://github.com/mswjs/msw/issues/2795
 * @note Node.js reads "NODE_USE_ENV_PROXY" only at startup, so the proxied
 * "fetch" from the issue is reproduced with an explicit "CONNECT" tunnel
 * that the proxying clients (e.g. Undici) establish under the hood.
 */
// @vitest-environment node
import { createTestHttpServer } from '@epic-web/test-server/http'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { createProxyServer, proxiedGet } from '../support/proxy-server'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('performs a request through an HTTP proxy as-is when no handlers match', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()

  const { response, responseText } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl: httpServer.http.url('/resource'),
  })

  expect.soft(response.statusCode).toBe(200)
  expect(responseText).toBe('original')
})

test('returns a mocked response to a request made through an HTTP proxy', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/resource', () => {
        return new Response('original')
      })
    },
  })
  await using proxyServer = await createProxyServer()
  const targetUrl = httpServer.http.url('/resource')

  server.use(
    http.get(targetUrl.href, () => {
      return HttpResponse.text('mocked')
    }),
  )

  const { response, responseText } = await proxiedGet({
    proxyUrl: proxyServer.url,
    targetUrl,
  })

  expect.soft(response.statusCode).toBe(200)
  expect(responseText).toBe('mocked')
})
