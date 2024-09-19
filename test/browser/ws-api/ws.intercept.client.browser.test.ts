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

test('does not throw on connecting to a non-existing host', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('*')

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        queueMicrotask(() => client.close())
      }),
    )
    await worker.start()
  })

  const clientClosePromise = page.evaluate(() => {
    const socket = new WebSocket('ws://non-existing-host.com')

    return new Promise<void>((resolve, reject) => {
      socket.onclose = () => resolve()
      socket.onerror = reject
    })
  })

  await expect(clientClosePromise).resolves.toBeUndefined()
})

test('intercepts outgoing client text message', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  const clientMessagePromise = page.evaluate(() => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            if (typeof event.data === 'string') {
              resolve(event.data)
            }
          })
        }),
      )
      await worker.start()
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
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  const clientMessagePromise = page.evaluate(() => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            if (event.data instanceof Blob) {
              resolve(event.data.text())
            }
          })
        }),
      )
      await worker.start()
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
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  const clientMessagePromise = page.evaluate(() => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')

    return new Promise<string>(async (resolve) => {
      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          client.addEventListener('message', (event) => {
            if (event.data instanceof Uint8Array) {
              resolve(new TextDecoder().decode(event.data))
            }
          })
        }),
      )
      await worker.start()
    })
  })

  await page.evaluate(() => {
    const socket = new WebSocket('wss://example.com')
    socket.onopen = () => socket.send(new TextEncoder().encode('hello world'))
  })

  expect(await clientMessagePromise).toBe('hello world')
})
