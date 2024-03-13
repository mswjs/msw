import { test, expect } from '../playwright.extend'
import type { ws } from '../../../src/core/ws/ws'
import type { SetupWorker } from '../../../src/browser'
import { WebSocketServer } from '../../support/WebSocketServer'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      worker: SetupWorker
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
  await loadExample(require.resolve('./ws.runtime.js'))

  server.on('connection', (client) => {
    client.send('hello')
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            resolve(event.data)
          })
        }),
      )
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
  await loadExample(require.resolve('./ws.runtime.js'))

  server.on('connection', async (client) => {
    /**
     * @note `ws` doesn't accept sending Blobs.
     */
    client.send(await new Blob(['hello']).arrayBuffer())
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            resolve(event.data.text())
          })
        }),
      )
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
  await loadExample(require.resolve('./ws.runtime.js'))

  const encoder = new TextEncoder()
  server.on('connection', async (client) => {
    client.binaryType = 'arraybuffer'
    client.send(encoder.encode('hello'))
  })

  const serverMessagePromise = page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ server }) => {
          server.connect()
          server.addEventListener('message', (event) => {
            resolve(new TextDecoder().decode(event.data))
          })
        }),
      )
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
