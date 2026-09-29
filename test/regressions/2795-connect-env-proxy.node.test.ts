/**
 * @see https://github.com/mswjs/msw/issues/2795
 * @note Node.js reads "NODE_USE_ENV_PROXY" only at startup, so the proxied
 * "fetch" from the issue is reproduced with an explicit "CONNECT" tunnel
 * that the proxying clients (e.g. Undici) establish under the hood.
 */
// @vitest-environment node
import { once } from 'node:events'
import nodeHttp from 'node:http'
import net from 'node:net'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { waitForClientRequest } from '../support/utils'

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

/**
 * A forward HTTP proxy that establishes "CONNECT" tunnels
 * to the requested authority.
 */
async function createProxyServer(): Promise<{ url: URL } & AsyncDisposable> {
  const proxyServer = nodeHttp.createServer()
  const proxySockets = new Set<net.Socket>()

  proxyServer.on('connect', (request, clientSocket, head) => {
    const target = new URL(`http://${request.url}`)
    const targetSocket = net.connect(
      Number(target.port),
      target.hostname,
      () => {
        clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
        targetSocket.write(head)
        targetSocket.pipe(clientSocket)
        clientSocket.pipe(targetSocket)
      },
    )

    proxySockets.add(clientSocket)
    proxySockets.add(targetSocket)
  })

  proxyServer.listen(0, '127.0.0.1')
  await once(proxyServer, 'listening')

  const address = proxyServer.address()

  if (address == null || typeof address === 'string') {
    throw new Error('Failed to resolve the proxy server address')
  }

  return {
    url: new URL(`http://127.0.0.1:${address.port}`),
    async [Symbol.asyncDispose]() {
      for (const socket of proxySockets) {
        socket.destroy()
      }

      proxyServer.close()
      await once(proxyServer, 'close')
    },
  }
}

/**
 * Establish a "CONNECT" tunnel through the proxy and perform
 * a request to the target URL over that tunnel.
 */
async function proxiedGet(args: { proxyUrl: URL; targetUrl: URL }) {
  const connectRequest = nodeHttp.request({
    host: args.proxyUrl.hostname,
    port: args.proxyUrl.port,
    method: 'CONNECT',
    path: args.targetUrl.host,
  })
  connectRequest.end()

  const pendingSocket = Promise.withResolvers<net.Socket>()

  connectRequest.once('connect', (connectResponse, socket) => {
    if (connectResponse.statusCode === 200) {
      pendingSocket.resolve(socket)
      return
    }

    pendingSocket.reject(
      new Error(
        `Failed to establish a tunnel: proxy responded with ${connectResponse.statusCode}`,
      ),
    )
  })
  connectRequest.once('error', pendingSocket.reject)

  const tunnelSocket = await pendingSocket.promise

  const request = nodeHttp.get(args.targetUrl, {
    createConnection() {
      return tunnelSocket
    },
  })

  return waitForClientRequest(request)
}

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
