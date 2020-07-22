import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'

let runtimeRef: TestAPI

async function startWorker() {
  const errors: string[] = []
  const warnings: string[] = []

  const runtime = await runBrowserWith(path.resolve(__dirname, 'warn.mocks.ts'))

  runtime.page.on('console', (message) => {
    const messageText = message.text()

    switch (message.type()) {
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

  return { runtime, errors, warnings }
}

afterEach(async () => {
  await runtimeRef.cleanup()
})

test('warns on an unhandled request when using the "warn" option', async () => {
  const { runtime, warnings, errors } = await startWorker()

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  expect(status).toBe(404)
  expect(errors).toHaveLength(0)
  expect(warnings).toContain(
    '[MSW] Warning: captured a GET https://mswjs.io/non-existing-page request without a corresponding request handler.',
  )
})
