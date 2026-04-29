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

test('', async ({ loadExample, page }) => {
  await loadExample(new URL('./ws.runtime.js', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, ws } = window.msw
    const service = ws.link('wss://localhost/ws')

    const worker = setupWorker(
      service.addEventListener('connection', ({ client }) => {
        console.log('CONNECTION CALLED!')
        client.send('hello world')
      }),
    )
    await worker.start()
  })

  await page.evaluate(async () => {
    await fetch('https://localhost/ws', {
      headers: {
        upgrade: 'websocket',
      },
    })

    // const socket = new WebSocket('wss://example.com')
    // return new Promise<string>((resolve, reject) => {
    //   socket.onmessage = (event) => resolve(event.data)
    //   socket.onerror = () => reject(new Error('WebSocket error'))
    // }).finally(() => socket.close())
  })
})
