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
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
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
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
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

  await expect(clientMessagePromise).resolves.toBe('hello world')
})

test('intercepts outgoing client Blob message', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
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

  await expect(clientMessagePromise).resolves.toBe('hello world')
})

test('intercepts outgoing client ArrayBuffer message', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
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

  await expect(clientMessagePromise).resolves.toBe('hello world')
})

test('resolves relative link URL against the page origin', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('/api')

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        client.send('hello world')
      }),
    )
    await worker.start()
  })

  const messagePromise = page.evaluate(() => {
    const pendingMessage = Promise.withResolvers<string>()
    const socket = new WebSocket('/api')
    socket.onmessage = (event) => pendingMessage.resolve(event.data)
    socket.onerror = () =>
      pendingMessage.reject('Did not match the WebSocket connection')

    return pendingMessage.promise
  })

  await expect(messagePromise).resolves.toBe('hello world')
})
