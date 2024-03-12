import { test, expect } from '../playwright.extend'
import { ws } from '../../../src/core/ws/ws'
import { SetupWorker } from '../../../src/browser'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      worker: SetupWorker
    }
  }
}

test('intercepts outgoing client text message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  const clientMessagePromise = page.evaluate(() => {
    const { worker, ws } = window.msw

    const service = ws.link('wss://example.com')

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            resolve(event.data)
          })
        }),
      )
    })
  })

  await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    socket.onopen = () => socket.send('hello world')
  })

  expect(await clientMessagePromise).toBe('hello world')
})

test('intercepts outgoing client Blob message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  const clientMessagePromise = page.evaluate(() => {
    const { worker, ws } = window.msw

    const service = ws.link('wss://example.com')

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            resolve(event.data.text())
          })
        }),
      )
    })
  })

  await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    socket.onopen = () => socket.send(new Blob(['hello world']))
  })

  expect(await clientMessagePromise).toBe('hello world')
})

test('intercepts outgoing client ArrayBuffer message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'))

  const clientMessagePromise = page.evaluate(() => {
    const { worker, ws } = window.msw

    const service = ws.link('wss://example.com')

    return new Promise<string>((resolve) => {
      worker.use(
        service.on('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            resolve(new TextDecoder().decode(event.data))
          })
        }),
      )
    })
  })

  await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    socket.onopen = () => socket.send(new TextEncoder().encode('hello world'))
  })

  expect(await clientMessagePromise).toBe('hello world')
})
