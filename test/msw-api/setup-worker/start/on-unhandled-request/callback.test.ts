import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'

let runtimeRef: TestAPI

async function startWorker() {
  const logs: string[] = []
  const errors: string[] = []
  const warnings: string[] = []

  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'callback.mocks.ts'),
  )

  runtime.page.on('console', (message) => {
    const messageText = message.text()

    switch (message.type()) {
      case 'log': {
        logs.push(messageText)
        break
      }

      case 'warning': {
        if (messageText.startsWith('[MSW]')) {
          warnings.push(messageText)
          break
        }
      }

      case 'error': {
        if (messageText.startsWith('[MSW]')) {
          errors.push(messageText)
          break
        }
      }
    }
  })

  runtimeRef = runtime

  return { runtime, logs, errors, warnings }
}

afterEach(async () => {
  await runtimeRef.cleanup()
})

test('executes a given callback on an unhandled request', async () => {
  const { runtime, logs, warnings, errors } = await startWorker()

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(404)

  // Custom callback executed.
  expect(logs).toContain(
    'Oops, unhandled GET https://mswjs.io/non-existing-page',
  )

  // No warnings/errors produced by MSW.
  expect(errors).toHaveLength(0)
  expect(warnings).toHaveLength(0)
})
