import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi } from 'msw'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'error.mocks.ts'),
  })
}

test('rejects with a custom error message when given a non-existing worker script', async () => {
  const { page } = await createRuntime()
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
