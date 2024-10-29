import type { ws } from 'msw'
import type { SetupWorker, setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare global {
  interface Window {
    worker: SetupWorker
    msw: {
      ws: typeof ws
      setupWorker: typeof setupWorker
    }
  }
}

test('does not apply the interceptor until "worker.start()" is called', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./ws.runtime.js'), {
    skipActivation: true,
  })

  await page.evaluate(() => {
    const { setupWorker, ws } = window.msw
    const api = ws.link('wss://example.com')
    window.worker = setupWorker(api.addEventListener('connection', () => {}))
  })

  await expect(
    page.evaluate(() => {
      return new WebSocket('wss://example.com').constructor.name
    }),
  ).resolves.toBe('WebSocket')

  await page.evaluate(async () => {
    await window.worker.start()
  })

  await expect(
    page.evaluate(() => {
      return new WebSocket('wss://example.com').constructor.name
    }),
  ).resolves.not.toBe('WebSocket')
})
