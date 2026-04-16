import { setTimeout } from 'node:timers/promises'
import { sse } from 'msw'
import { setupWorker } from 'msw/browser'
import { createTestHttpServer } from '@epic-web/test-server/http'
import { DeferredPromise } from '@open-draft/deferred-promise'
import { test, expect } from '../playwright.extend'

declare namespace window {
  export const msw: {
    setupWorker: typeof setupWorker
    sse: typeof sse
  }
}

const EXAMPLE_URL = new URL('./sse.mocks.ts', import.meta.url)

const SSE_HEADERS = {
  'access-control-allow-origin': '*',
  'content-type': 'text/event-stream',
  'cache-control': 'no-cache',
  connection: 'keep-alive',
}

test('stops reconnecting to the upstream when the consumer closes mid-backoff', async ({
  loadExample,
  page,
}) => {
  await loadExample(EXAMPLE_URL, {
    skipActivation: true,
  })

  let upstreamRequestCount = 0
  const firstRequestReceived = new DeferredPromise<void>()

  await using server = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/stream', () => {
        upstreamRequestCount += 1
        if (upstreamRequestCount === 1) {
          firstRequestReceived.resolve()
        }

        const stream = new ReadableStream({
          start(controller) {
            // Set a short reconnection time so the test does not
            // have to wait the default 2s.
            controller.enqueue(new TextEncoder().encode('retry:200\n\n'))
            controller.enqueue(
              new TextEncoder().encode('data: {"message": "hello"}\n\n'),
            )
            // Close the stream to push the upstream EventSource into
            // its reconnect backoff window.
            controller.close()
          },
        })

        return new Response(stream, { headers: SSE_HEADERS })
      })
    },
  })
  const url = server.http.url('/stream').href

  await page.evaluate(async (url) => {
    const { setupWorker, sse } = window.msw

    const worker = setupWorker(
      sse(url, ({ server }) => {
        server.connect()
      }),
    )
    await worker.start()
  }, url)

  await page.evaluate((url) => {
    return new Promise<void>((resolve) => {
      const source = new EventSource(url)
      source.addEventListener('message', () => {
        // Close while the upstream EventSource is mid-reconnect-backoff (200ms).
        source.close()
        resolve()
      })
    })
  }, url)

  await firstRequestReceived

  // Wait long enough for a second reconnect to have fired if the
  // abort wiring did not cancel the backoff.
  await setTimeout(600)

  expect(upstreamRequestCount).toBe(1)
})
