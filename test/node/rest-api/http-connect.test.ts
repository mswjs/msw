// @vitest-environment node
import * as nodeNet from 'node:net'
import * as nodeHttp from 'node:http'
import { once } from 'node:events'
import { invariant } from 'outvariant'
import { http, passthrough } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

/**
 * A real forward proxy that establishes tunnels to the requested target.
 * CONNECT requests must be dialed at a proxy: the connection goes to the
 * proxy address while the request target ("path") describes the tunnel
 * destination. A plain HTTP server closes CONNECT sockets unless it
 * listens to the "connect" event.
 */
const proxyServer = nodeHttp.createServer()
proxyServer.on('connect', (proxyRequest, clientSocket) => {
  invariant(proxyRequest.url, 'Expected a CONNECT request target')
  const [targetHost, targetPort] = proxyRequest.url.split(':')
  const targetSocket = nodeNet.connect(Number(targetPort), targetHost, () => {
    clientSocket.write('HTTP/1.1 200 Connection Established\r\n\r\n')
    targetSocket.pipe(clientSocket)
    clientSocket.pipe(targetSocket)
  })
})

function getProxyPort(): number {
  const proxyAddress = proxyServer.address()
  invariant(
    proxyAddress != null && typeof proxyAddress !== 'string',
    'Expected the proxy server to listen on a TCP port',
  )
  return proxyAddress.port
}

beforeAll(async () => {
  server.listen()
  vi.spyOn(global.console, 'warn').mockImplementation(() => void 0)
  await new Promise<void>((resolve) => proxyServer.listen(0, resolve))
})

afterEach(() => {
  server.resetHandlers()
  vi.clearAllMocks()
})

afterAll(async () => {
  server.close()
  vi.restoreAllMocks()
  proxyServer.closeAllConnections()
  await new Promise((resolve) => proxyServer.close(resolve))
})

it('intercepts a CONNECT request to a real server', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/api', () => new Response('original'))
    },
  })

  const serverHost = httpServer.http.url().host
  const requestPromise = Promise.withResolvers<Request>()

  server.use(
    http.connect(serverHost, ({ request }) => {
      requestPromise.resolve(request)
      return passthrough()
    }),
  )

  const request = nodeHttp
    .request({
      method: 'CONNECT',
      host: '127.0.0.1',
      port: getProxyPort(),
      path: serverHost,
    })
    .end()

  /**
   * @note A response to CONNECT never emits the "response" event.
   * The client emits "connect" with the response and the tunnel socket.
   */
  const [response, socket] = await once(request, 'connect')
  expect.soft(response.statusCode).toBe(200)

  const interceptedRequest = await requestPromise.promise
  expect.soft(interceptedRequest.method).toBe('CONNECT')
  expect.soft(interceptedRequest.url).toBe(serverHost)

  // Send a request through the established tunnel
  // to ensure it reaches the actual test server.
  socket.write(
    `GET /api HTTP/1.1\r\nHost: ${serverHost}\r\nConnection: close\r\n\r\n`,
  )
  const responseChunks: Array<Buffer> = []
  for await (const chunk of socket) {
    responseChunks.push(Buffer.from(chunk))
  }
  const tunneledResponse = Buffer.concat(responseChunks).toString()
  expect.soft(tunneledResponse).toMatch(/^HTTP\/1\.1 200/)
  expect.soft(tunneledResponse).toMatch(/original$/)

  expect.soft(console.warn).toHaveBeenCalledWith(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET http://${serverHost}/api

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`)
})

it('mocks a successful response to a CONNECT request', async () => {
  // No server listens on this authority: both the tunnel
  // and the tunneled request are mocked.
  const serverHost = '127.0.0.1:8877'
  const requestPromise = Promise.withResolvers<Request>()

  server.use(
    http.connect(serverHost, ({ request }) => {
      requestPromise.resolve(request)
      return new Response()
    }),
    http.get(`http://${serverHost}/api`, () => {
      return new Response('mocked')
    }),
  )

  const request = nodeHttp
    .request({
      method: 'CONNECT',
      host: '127.0.0.1',
      port: 1337,
      path: serverHost,
    })
    .end()

  const [response, socket] = await once(request, 'connect')
  expect.soft(response.statusCode).toBe(200)

  const interceptedRequest = await requestPromise.promise
  expect.soft(interceptedRequest.method).toBe('CONNECT')
  expect.soft(interceptedRequest.url).toBe(serverHost)

  socket.write(
    `GET /api HTTP/1.1\r\nHost: ${serverHost}\r\nConnection: close\r\n\r\n`,
  )
  const responseChunks: Array<Buffer> = []
  for await (const chunk of socket) {
    responseChunks.push(Buffer.from(chunk))
  }
  const tunneledResponse = Buffer.concat(responseChunks).toString()
  expect.soft(tunneledResponse).toMatch(/^HTTP\/1\.1 200/)
  expect.soft(tunneledResponse).toMatch(/mocked$/)

  expect.soft(console.warn).not.toHaveBeenCalled()
})

it('mocks an error response to a CONNECT request', async () => {
  const serverHost = '127.0.0.1:8877'

  server.use(
    http.connect(serverHost, () => {
      return new Response(null, { status: 502, statusText: 'Bad Gateway' })
    }),
  )

  const request = nodeHttp
    .request({
      method: 'CONNECT',
      host: '127.0.0.1',
      port: 1337,
      path: serverHost,
    })
    .end()

  const responseListener = vi.fn()
  const errorListener = vi.fn()
  request.on('response', responseListener)
  request.on('error', errorListener)

  /**
   * @note Node.js emits the "connect" event for any response
   * to a CONNECT request, error responses included. It is the
   * consumer's responsibility to check the response status code
   * before using the tunnel (e.g. proxy agents fail the request
   * if the tunnel response is not a 200).
   */
  const [response, socket] = await once(request, 'connect')
  expect.soft(response.statusCode).toBe(502)
  expect.soft(response.statusMessage).toBe('Bad Gateway')

  /**
   * @note No tunnel is established. It is the consumer who reacts
   * to the error response by destroying the socket (e.g. proxy agents
   * fail the request if the tunnel response is not a 200).
   */
  socket.destroy()
  await once(socket, 'close')

  expect.soft(responseListener).not.toHaveBeenCalled()
  expect.soft(errorListener).not.toHaveBeenCalled()
})
