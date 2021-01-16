import * as path from 'path'
import { SetupWorkerApi } from 'msw'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
  }
}

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'error.mocks.ts'))
})

afterAll(() => runtime.cleanup())

test('prints a custom error message when given a non-existing worker script', async () => {
  const { messages } = captureConsole(runtime.page)

  await runtime.page.evaluate(() => {
    return window.msw.worker.start({
      serviceWorker: {
        url: 'invalidServiceWorker',
      },
    })
  })

  const workerNotFoundMessage = messages.error.find((text) => {
    return (
      text.startsWith(
        `[MSW] Failed to register a Service Worker for scope ('${runtime.page.url()}')`,
      ) && text.includes('Did you forget to run "npx msw init <PUBLIC_DIR>"?')
    )
  })

  expect(workerNotFoundMessage).toBeTruthy()
})
