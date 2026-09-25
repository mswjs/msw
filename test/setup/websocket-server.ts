import { WebSocketServer } from 'ws'

/**
 * The shared WebSocket test server.
 *
 * Tests cannot reach this server directly: it runs in the vitest host
 * process while the tests run in Node.js workers or in the browser.
 * Instead, a test scripts the server's behavior for its connection
 * through the URL search parameters, and observes that behavior
 * through the WebSocket client. The same URL works in both runtimes,
 * which keeps WebSocket tests neutral.
 *
 * @example
 * const socket = new WebSocket(testServer.ws.url('/?greet&echo'))
 *
 * Supported search parameters (can be combined):
 * - `greet[=message]`, send a text message to the client on connection
 *   ("hello from server" by default);
 * - `greet-binary`, send a binary message ("hello") to the client on connection;
 * - `echo`, send every message received from the client back to it, as-is;
 * - `conversation`, greet the client and reply to "how are you, server?";
 * - `close[=code,reason]`, close the connection with the given code and reason.
 */
export function createWebSocketServer(): WebSocketServer {
  const server = new WebSocketServer({
    host: '127.0.0.1',
    port: 0,
  })

  server.on('connection', (client, request) => {
    const url = new URL(request.url ?? '/', 'ws://localhost')

    if (url.searchParams.has('greet')) {
      client.send(url.searchParams.get('greet') || 'hello from server')
    }

    if (url.searchParams.has('greet-binary')) {
      client.send(new TextEncoder().encode('hello'))
    }

    if (url.searchParams.has('echo')) {
      client.on('message', (data, isBinary) => {
        client.send(data, { binary: isBinary })
      })
    }

    if (url.searchParams.has('conversation')) {
      client.send('hello from server')
      client.on('message', (data) => {
        if (data.toString() === 'how are you, server?') {
          client.send('thanks, not bad')
        }
      })
    }

    if (url.searchParams.has('close')) {
      const [code, reason] = (url.searchParams.get('close') ?? '').split(',')
      client.close(Number(code) || undefined, reason)
    }
  })

  return server
}

export function getWebSocketServerUrl(server: WebSocketServer): string {
  const address = server.address()

  if (address == null) {
    throw new Error('Failed to resolve the WebSocket test server address')
  }

  return typeof address === 'string'
    ? address
    : `ws://${address.address}:${address.port}/`
}

export function closeWebSocketServer(server: WebSocketServer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    for (const client of server.clients) {
      client.close()
    }

    server.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })
}
