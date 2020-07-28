import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'

let runtimeRef: TestAPI

async function startWorker() {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'bypass.mocks.ts'),
  )

  runtimeRef = runtime

  return runtime
}

afterEach(async () => {
  await runtimeRef.cleanup()
})

test('bypasses an unhandled request by default', async () => {
  const runtime = await startWorker()
  const { messages } = captureConsole(runtime.page, filterLibraryLogs)

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  // Produces no MSW warnings/errors.
  expect(messages.error).toHaveLength(0)
  expect(messages.warning).toHaveLength(0)

  // Performs the request as-is.
  expect(status).toBe(404)
})
