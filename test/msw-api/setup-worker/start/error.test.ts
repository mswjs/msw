import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../support/runBrowserWith'
import { captureConsole } from '../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'error.mocks.ts'))
})

afterAll(() => runtime.cleanup())

test('prints a custom error message when given a non-existing worker script', async () => {
  const errors: string[] = []
  captureConsole(runtime.page, errors, (message) => {
    return message.type() === 'error'
  })

  await runtime.page.evaluate(() => {
    // @ts-ignore
    return window.window.__MSW_START__({
      serviceWorker: {
        url: 'invalidServiceWorker',
      },
    })
  })

  const workerNotFoundMessage = errors.find((message) => {
    return (
      message.startsWith(
        `[MSW] Failed to register a Service Worker for scope ('${runtime.page.url()}')`,
      ) &&
      message.includes('Did you forget to run "npx msw init <PUBLIC_DIR>"?')
    )
  })

  expect(workerNotFoundMessage).toBeTruthy()
})
