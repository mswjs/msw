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

test('does not connect to the actual server by default', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  server.once('connection', (client) => {
    client.send('must not receive this')
  })

  await page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    worker.use(
      service.on('connection', ({ client }) => {
        queueMicrotask(() => client.send('mock'))
      }),
    )
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)

    return new Promise((resolve, reject) => {
      socket.onmessage = (event) => {
        resolve(event.data)
        socket.close()
      }
      socket.onerror = reject
    })
  }, server.url)

  expect(clientMessage).toBe('mock')
})

test('forwards incoming server events to the client once connected', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  server.once('connection', (client) => {
    client.send('hello from server')
  })

  await page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    worker.use(
      service.on('connection', ({ server }) => {
        // Calling "connect()" establishes the connection
        // to the actual WebSocket server.
        server.connect()
      }),
    )
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)

    return new Promise((resolve, reject) => {
      socket.onmessage = (event) => {
        resolve(event.data)
        socket.close()
      }
      socket.onerror = reject
    })
  }, server.url)

  expect(clientMessage).toBe('hello from server')
})

test('throws an error when connecting to a non-existing server', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  const error = await page.evaluate((serverUrl) => {
    const { worker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise((resolve) => {
      worker.use(
        service.on('connection', ({ server }) => {
          server.connect()
        }),
      )

      const socket = new WebSocket(serverUrl)
      socket.onerror = () => resolve('Connection failed')
    })
  }, 'ws://non-existing-websocket-address.com')

  expect(error).toMatch('Connection failed')
})
