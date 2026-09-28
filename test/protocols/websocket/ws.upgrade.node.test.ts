// @vitest-environment node
import type http from 'node:http'
import https from 'node:https'
import { ws } from 'msw/ws'
import { setupServer } from 'msw/node'

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

test('rejects a WebSocket upgrade via an HTTP request like Node.js', async () => {
  const api = ws.link('wss://localhost/ws')

  const connectionListener = vi.fn()
  server.use(api.addEventListener('connection', connectionListener))

  // Node.js `fetch` (Undici) does not support protocol upgrades
  // and rejects any request that receives a "101 Switching Protocols"
  // response. Intercepted upgrade requests must behave the same.
  const fetchError = await fetch('https://localhost/ws', {
    headers: {
      upgrade: 'websocket',
      connection: 'upgrade',
      'sec-websocket-key': 'abc-123',
    },
  }).then(
    () => {
      expect.fail('The upgrade request must not succeed')
    },
    (error) => {
      return error
    },
  )

  expect.soft(fetchError).toBeInstanceOf(TypeError)
  expect.soft(fetchError.message).toBe('fetch failed')

  expect(connectionListener).not.toHaveBeenCalled()
})

test('resolves upgrade requests with a custom "ws.onUpgrade"', async () => {
  const originalOnUpgrade = ws.onUpgrade

  // Create the link before overriding `ws.onUpgrade`
  // to make sure the override is read at request time.
  const api = ws.link('wss://localhost/ws')
  server.use(api.addEventListener('connection', vi.fn()))

  const onUpgrade = vi.fn<typeof ws.onUpgrade>(() => {
    return Response.json({ upgraded: true })
  })
  ws.onUpgrade = onUpgrade

  try {
    /**
     * @note Perform the upgrade request via `node:https`.
     * Undici (`fetch`) rejects requests with the `upgrade` header
     * before they can be intercepted.
     */
    const response = await new Promise<http.IncomingMessage>(
      (resolve, reject) => {
        https
          .request('https://localhost/ws', {
            headers: {
              upgrade: 'websocket',
              connection: 'upgrade',
              'sec-websocket-key': 'abc-123',
            },
          })
          .once('response', resolve)
          .once('upgrade', () => {
            reject(
              new Error(
                'Must not receive an upgrade response from the default "ws.onUpgrade"',
              ),
            )
          })
          .once('error', reject)
          .end()
      },
    )
    const responseBody = await new Promise<string>((resolve) => {
      let body = ''
      response.on('data', (chunk) => {
        body += chunk
      })
      response.on('end', () => {
        resolve(body)
      })
    })

    expect.soft(onUpgrade).toHaveBeenCalledOnce()
    expect.soft(onUpgrade).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: expect.any(String),
        request: expect.any(Request),
        params: {},
      }),
    )
    expect.soft(response.statusCode).toBe(200)
    expect(JSON.parse(responseBody)).toEqual({ upgraded: true })
  } finally {
    ws.onUpgrade = originalOnUpgrade
  }
})
