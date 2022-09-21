import { SetupWorkerApi } from 'msw'
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
  await loadExample(require.resolve('./error.mocks.ts'))

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
