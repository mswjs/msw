import type { ws } from 'msw'
import type { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'
import { WebSocketServer } from '../../support/WebSocketServer'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

const server = new WebSocketServer()

test.beforeAll(async () => {
  await server.listen()
})

test.afterAll(async () => {
  await server.close()
})

test('intercepts incoming server text message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  server.on('connection', (client) => {
    client.send('hello')
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            if (typeof event.data === 'string') {
              resolve(event.data)
            }
          })
        }),
      )
      await worker.start()
    })
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)

    return new Promise<string>((resolve, reject) => {
      socket.onerror = () => reject(new Error('Socket error'))
      socket.addEventListener('message', (event) => {
        resolve(event.data)
      })
    })
  }, server.url)

  expect(clientMessage).toBe('hello')
  expect(await serverMessagePromise).toBe('hello')
})

test('intercepts incoming server Blob message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  server.on('connection', async (client) => {
    /**
     * `ws` doesn't support sending Blobs.
     * @see https://github.com/websockets/ws/issues/2206
     */
    client.send(await new Blob(['hello']).arrayBuffer())
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            if (event.data instanceof Blob) {
              resolve(event.data.text())
            }
          })
        }),
      )
      await worker.start()
    })
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)

    return new Promise<string>((resolve, reject) => {
      socket.onerror = () => reject(new Error('Socket error'))
      socket.addEventListener('message', (event) => {
        resolve(event.data.text())
      })
    })
  }, server.url)

  expect(clientMessage).toBe('hello')
  expect(await serverMessagePromise).toBe('hello')
})

test('intercepts outgoing server ArrayBuffer message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  const encoder = new TextEncoder()
  server.on('connection', async (client) => {
    client.binaryType = 'arraybuffer'
    client.send(encoder.encode('hello'))
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            resolve(new TextDecoder().decode(event.data as Uint8Array))
          })
        }),
      )
      await worker.start()
    })
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)
    socket.binaryType = 'arraybuffer'

    return new Promise<string>((resolve, reject) => {
      socket.onerror = () => reject(new Error('Socket error'))
      socket.addEventListener('message', (event) => {
        resolve(new TextDecoder().decode(event.data))
      })
    })
  }, server.url)

  expect(clientMessage).toBe('hello')
  expect(await serverMessagePromise).toBe('hello')
})
