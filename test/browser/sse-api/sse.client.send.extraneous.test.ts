import { http, sse, type ServerSentEventMessage } from 'msw'
import { setupWorker } from 'msw/browser'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    http: typeof http
    sse: typeof sse
  }
}

test('supports triggerring events from another handlers', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./sse.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  await page.evaluate(async () => {
    const { setupWorker, http, sse } = window.msw
    const target = new EventTarget()

    const worker = setupWorker(
      sse('/stream', ({ client }) => {
        // Listen to the event target dispatching message events
        // to trigger server-sent events to the client.
        target.addEventListener('message', (event) => {
          if (event instanceof MessageEvent) {
            client.send(event.data)
          }
        })
      }),
      http.get('/trigger', () => {
        // Dispatch a message event onto the event target
        // to trigger a server-sent event to the client.
        target.dispatchEvent(
          new MessageEvent('message', {
            data: {
              data: 'hello world',
            } satisfies ServerSentEventMessage,
          }),
        )

        return new Response()
      }),
    )

    await worker.start()
  })

  const message = await page.evaluate(() => {
    return new Promise<string>(async (resolve, reject) => {
      const source = new EventSource('/stream')
      source.addEventListener('message', (event) => {
        resolve(event.data)
      })
      source.addEventListener('error', () => {
        reject(new Error('EventSource errored'))
      })

      source.addEventListener('open', async () => {
        await fetch('/trigger').catch((error) => reject(error))
      })
    })
  })

  expect(message).toBe('hello world')
})
