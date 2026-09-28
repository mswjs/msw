import type { Page } from '@playwright/test'
import type { setupWorker } from 'msw/browser'
import type { ws } from 'msw/ws'
import { inlineSource, test, expect } from '../../setup/playwright'

const wsSource = inlineSource(`
import { setupWorker } from 'msw/browser'
import { ws } from 'msw/ws'

window.msw = {
  setupWorker,
  ws,
}

export { setupWorker, ws }
`)

declare global {
  interface Window {
    msw: {
      setupWorker: typeof setupWorker
      ws: typeof ws
    }
  }
}

test('sends data to multiple clients on connection', async ({
  loadExample,
  browser,
  page,
}) => {
  const { compilation } = await loadExample(wsSource, {
    skipActivation: true,
  })

  async function createSocketAndGetFirstMessage(page: Page) {
    await page.waitForFunction(() => {
      return typeof window.msw !== 'undefined'
    })

    await page.evaluate(async () => {
      const { setupWorker, ws } = window.msw
      const service = ws.link('wss://example.com')

      const worker = setupWorker(
        service.addEventListener('connection', ({ client }) => {
          client.send('hello world')
        }),
      )
      await worker.start()
    })

    return page.evaluate(async () => {
      const socket = new WebSocket('wss://example.com')
      return new Promise<string>((resolve, reject) => {
        socket.onmessage = (event) => {
          resolve(event.data)
        }
        socket.onerror = () => {
          reject(new Error('WebSocket error'))
        }
      }).finally(() => {
        socket.close()
      })
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
