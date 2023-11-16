/**
 * @see https://github.com/mswjs/msw/issues/1573
 */
import { test, expect } from '../../../../browser/playwright.extend'

declare global {
  interface Window {
    worker: import('msw/browser').SetupWorkerApi
  }
}

test('restores module patches if "worker.stop()" was called before worker registration resolved', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./abort-deferred-network.mocks.ts'), {
    /**
     * @note Skip activation because the worker will never start.
     */
    skipActivation: true,
  })

  await page.evaluate(() => {
    /**
     * @note Intentionally patch the "register()" method of the Service Worker API
     * to make it take a long time before resolving. We will stop the MSW worker
     * meanwhile and test that it restores the fetch/XHR patches correctly.
     */
    Reflect.set(navigator.serviceWorker, 'register', async () => {
      console.warn('navigator.serviceWorker.register() CALLED!')
      await new Promise((resolve) => setTimeout(resolve, 10_000))
    })
  })

  await page.evaluate(() => {
    /**
     * @note Don't await the start promise because it will never resolve.
     * But MSW defers the network eagerly once the "start()" is called.
     */
    window.worker.start()
  })

  // The requets modules must be patched since we've just called "worker.start()".
  await expect(page.evaluate(() => window.fetch.name)).resolves.toBe(
    'deferredFetch',
  )
  await expect(
    page.evaluate(() => window.XMLHttpRequest.prototype.send.name),
  ).resolves.toBe('deferredSend')

  await page.evaluate(() => {
    // Then, stop the worker immediately even though it hasn't started yet.
    // We currently don't have any logic to cancel the pending start promise.
    // Ideally, you should never call "stop()" before awaiting "start()".
    // This test is an edge case.
    window.worker.stop()
  })

  // Assert that the module patches have been restored.
  await expect(page.evaluate(() => window.fetch.name)).resolves.toBe('fetch')
  await expect(
    page.evaluate(() => window.XMLHttpRequest.prototype.send.name),
  ).resolves.toBe('send')
})
