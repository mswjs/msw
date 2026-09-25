import { http, sse } from 'msw'
import { type ServerSentEventMessage } from 'msw'
import { test, expect } from '../../setup/vitest-helpers'

test('supports triggerring events from another handlers', async ({
  network,
  page,
}) => {
  await page.evaluate(async () => {
    const target = new EventTarget()

    network.use(
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
