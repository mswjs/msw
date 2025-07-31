import { http, sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    http: typeof http
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

test('supports triggerring events from another handlers', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, http, sse } = window.msw

    const target = new EventTarget()

    const worker = setupWorker(
      sse('/stream', ({ client }) => {
        target.addEventListener('message', (event) => {
          client.send(event.data)
        })
      }),
      http.get('/trigger', () => {
        target.dispatchEvent(
          new MessageEvent('message', {
            data: sse.createMessage({
              data: 'hello world',
            }),
          }),
        )
      }),
    )

    await worker.start()
  })

  // ...
})
