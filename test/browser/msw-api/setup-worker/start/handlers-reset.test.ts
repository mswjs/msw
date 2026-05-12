/**
 * @see https://github.com/mswjs/msw/issues/2714
 */
import { test, expect } from '../../../playwright.extend'

declare global {
  interface Window {
    msw: {
      worker: import('msw/browser').SetupWorker
    }
  }
}

test('does not accumulate request handlers across restarts', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(new URL('./handlers-reset.mocks.ts', import.meta.url))

  // First request after the initial start.
  const firstResponse = await fetch('/resource')
  await expect(firstResponse.json()).resolves.toEqual({ callCount: 1 })

  // Stop and restart the worker.
  await page.evaluate(async () => {
    await window.msw.worker.stop()
    await window.msw.worker.start({ quiet: true })
  })

  // Second request after the first restart.
  // The handler must be called exactly once per request.
  const secondResponse = await fetch('/resource')
  await expect(secondResponse.json()).resolves.toEqual({ callCount: 2 })

  // Stop and restart the worker again.
  await page.evaluate(async () => {
    await window.msw.worker.stop()
    await window.msw.worker.start({ quiet: true })
  })

  // Third request after the second restart.
  const thirdResponse = await fetch('/resource')
  await expect(thirdResponse.json()).resolves.toEqual({ callCount: 3 })
})
