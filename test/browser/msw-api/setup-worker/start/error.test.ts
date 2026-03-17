import { SetupWorkerApi } from 'msw/browser'
import { test, expect } from '../../../playwright.extend'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

test('rejects with a custom error message when given a non-existing worker script', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./error.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  // Playwright is so fast we need to await the runtime module
  // exposing MSW on the global scope.
  await page.waitForFunction(() => {
    return typeof window.msw !== 'undefined'
  })

  await expect(
    page.evaluate(() => {
      return window.msw.worker.start({
        serviceWorker: {
          url: 'invalidServiceWorker',
        },
      })
    }),
  ).rejects.toThrowError(/\[MSW\] Failed/)
})
