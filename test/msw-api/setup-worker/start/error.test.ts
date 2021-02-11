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

test('prints a custom error message when given a non-existing worker script', async () => {
  const { page, consoleSpy } = await createRuntime()
  await page.evaluate(() => {
    return window.msw.worker.start({
      serviceWorker: {
        url: 'invalidServiceWorker',
      },
    })
  })

  const workerNotFoundMessage = consoleSpy.get('error').find((text) => {
    return (
      text.startsWith('[MSW] Failed to register a Service Worker for scope') &&
      text.includes('Did you forget to run "npx msw init <PUBLIC_DIR>"?')
    )
  })

  expect(workerNotFoundMessage).toBeTruthy()
})
