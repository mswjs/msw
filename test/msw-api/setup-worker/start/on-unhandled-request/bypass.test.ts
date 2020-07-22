import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'

let runtimeRef: TestAPI

async function startWorker() {
  const errors: string[] = []
  const warnings: string[] = []

  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'bypass.mocks.ts'),
  )

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

test('bypasses an unhandled request by default', async () => {
  const { runtime, errors, warnings } = await startWorker()

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  // Produces no MSW warnings/errors.
  expect(errors).toHaveLength(0)
  expect(warnings).toHaveLength(0)

  // Performs the request as-is.
  expect(status).toBe(404)
})
