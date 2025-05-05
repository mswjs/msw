import type { ws } from 'msw'
import type { setupWorker } from 'msw/browser'
import type { Page } from '@playwright/test'
import { test, expect } from '../playwright.extend'

declare global {
  interface Window {
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

test('sends data to a single client on connection', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        // Send a message to the client as soon as it connects.
        client.send('hello world')
      }),
    )
    await worker.start()
  })

  const clientMessage = await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    return new Promise<string>((resolve, reject) => {
      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = () => reject(new Error('WebSocket error'))
    }).finally(() => socket.close())
  })

  expect(clientMessage).toBe('hello world')
})

test('sends data to multiple clients on connection', async ({
  loadExample,
  browser,
  page,
}) => {
  const { compilation } = await loadExample(
    new URL('./ws.runtime.js', import.meta.url),
    {
      skipActivation: true,
    },
  )

  async function createSocketAndGetFirstMessage(page: Page) {
    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const service = ws.link('wss://example.com')

      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          // Send a message to the client as soon as it connects.
          client.send('hello world')
        }),
      )
      await worker.start()
    })

    return page.evaluate(async () => {
      const socket = new WebSocket('wss://example.com')
      return new Promise<string>((resolve, reject) => {
        socket.onmessage = (event) => resolve(event.data)
        socket.onerror = () => reject(new Error('WebSocket error'))
      }).finally(() => socket.close())
    })
  }

  const secondPage = await browser.newPage()
  await secondPage.goto(compilation.previewUrl)

  const [firstClientMessage, secondClientMessage] = await Promise.all([
    createSocketAndGetFirstMessage(page),
    createSocketAndGetFirstMessage(secondPage),
  ])

  expect(firstClientMessage).toBe('hello world')
  expect(secondClientMessage).toBe('hello world')
})

test('sends data in response to a client message', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://example.com')

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        client.addEventListener('message', (event) => {
          if (typeof event.data === 'string' && event.data === 'hello') {
            client.send('hello world')
          }
        })
      }),
    )
    await worker.start()
  })

  const clientMessage = await page.evaluate(async () => {
    const socket = new WebSocket('wss://example.com')
    socket.onopen = () => {
      socket.send('ignore this')
      socket.send('hello')
    }

    return new Promise<string>((resolve, reject) => {
      socket.onmessage = (event) => resolve(event.data)
      socket.onerror = () => reject(new Error('WebSocket error'))
    }).finally(() => socket.close())
  })

  expect(clientMessage).toBe('hello world')
})
