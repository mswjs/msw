import type { ws } from 'msw'
import type { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

test('does not connect to the actual server by default', async ({
  loadExample,
  page,
  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.once('connection', (client) => {
    client.send('must not receive this')
  })

  await page.evaluate(async (serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        queueMicrotask(() => client.send('mock'))
      }),
    )
    await worker.start()
  }, server.url)

  const clientMessage = await page.evaluate((serverUrl) => {
    const socket = new WebSocket(serverUrl)

    return new Promise((resolve, reject) => {
      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = () => reject(new Error('WebSocket error'))
    }).finally(() => socket.close())
  }, server.url)

  expect(clientMessage).toBe('mock')
})

test('forwards incoming server events to the client once connected', async ({
  loadExample,
  page,
  defineWebSocketServer,
}) => {
  const server = await defineWebSocketServer()
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  server.once('connection', (client) => {
    client.send('hello from server')
  })

  await page.evaluate(async (serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    const worker = setupWorker(
      service.addEventListener('connection', ({ server }) => {
        // Calling "connect()" establishes the connection
        // to the actual WebSocket server.
        server.connect()
      }),
    )
    await worker.start()
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
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  const error = await page.evaluate((serverUrl) => {
    const { setupWorker, ws } = window.msw
    const service = ws.link(serverUrl)

    return new Promise(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ server }) => {
          server.connect()
        }),
      )
      await worker.start()

      const socket = new WebSocket(serverUrl)
      socket.onerror = () => resolve('Connection failed')
    })
  }, 'ws://non-existing-websocket-address.com')

  expect(error).toMatch('Connection failed')
})
