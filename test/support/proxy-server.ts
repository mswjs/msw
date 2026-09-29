import { once } from 'node:events'
import nodeHttp from 'node:http'
import net from 'node:net'
import type { Duplex } from 'node:stream'
import { waitForClientRequest } from './utils'

/**
 * A forward HTTP proxy that establishes "CONNECT" tunnels
 * to the requested authority.
 */
export async function createProxyServer(): Promise<
  { url: URL } & AsyncDisposable
> {
  const proxyServer = nodeHttp.createServer()
  const proxySockets = new Set<Duplex>()

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
 * a "GET" request to the target URL over that tunnel.
 */
export async function proxiedGet(args: { proxyUrl: URL; targetUrl: URL }) {
  const connectRequest = nodeHttp.request({
    host: args.proxyUrl.hostname,
    port: args.proxyUrl.port,
    method: 'CONNECT',
    path: args.targetUrl.host,
  })
  connectRequest.end()

  const tunnelSocket = await new Promise<net.Socket>((resolve, reject) => {
    connectRequest.once('connect', (connectResponse, socket) => {
      if (connectResponse.statusCode === 200) {
        resolve(socket)
        return
      }

      reject(
        new Error(
          `Failed to establish a tunnel: proxy responded with ${connectResponse.statusCode}`,
        ),
      )
    })
    connectRequest.once('error', reject)
  })

  const request = nodeHttp.get(args.targetUrl, {
    createConnection() {
      return tunnelSocket
    },
  })

  return waitForClientRequest(request)
}
