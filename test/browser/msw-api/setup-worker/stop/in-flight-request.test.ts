import type { SetupWorkerApi } from '../../../../../src/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
  export let requestStartPromise: Promise<void>
}

test.beforeEach(() => {
  test.setTimeout(5000)
})

test('handles an in-flight request performed before the worker was stopped', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./in-flight-request.mocks.ts', import.meta.url))

  await page.evaluate(() => {
    window.requestStartPromise = new Promise<void>((resolve) => {
      window.msw.worker.events.on('request:start', () => {
        resolve()
      })
    })
  })

  const dataPromise = page.evaluate(async () => {
    const response = await fetch('/resource')
    return response.text()
  })

  // Wait for the worker to start handling the request.
  // Stopping the worker earlier races with the fetch event:
  // if "CLIENT_CLOSED" reaches the Service Worker first,
  // the request is bypassed and hits the actual server.
  await page.evaluate(() => {
    return window.requestStartPromise
  })

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  await expect(dataPromise).resolves.toBe('hello world')
})

test('bypasses requests made after the worker was stopped', async ({
  loadExample,
  page,
  fetch,
}) => {
  const { compilation } = await loadExample(
    new URL('./in-flight-request.mocks.ts', import.meta.url),
    {
      beforeNavigation(compilation) {
        compilation.use((router) => {
          router.get('/resource', (_req, res) => {
            res.send('original response')
          })
        })
      },
    },
  )

  const resourceUrl = new URL('./resource', compilation.previewUrl)

  await page.evaluate(() => {
    window.msw.worker.stop()
  })

  const dataPromise = page.evaluate(async (url) => {
    const response = await fetch(url)
    return response.text()
  }, resourceUrl.href)

  await expect(dataPromise).resolves.toBe('original response')
})
