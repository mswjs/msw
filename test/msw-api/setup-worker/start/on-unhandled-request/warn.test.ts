import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'warn.mocks.ts'))
})

afterEach(async () => {
  await runtime.cleanup()
})

test('warns on an unhandled request when using the "warn" option', async () => {
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  expect(status).toBe(404)

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)

  expect(libraryErrors).toHaveLength(0)
  expect(libraryWarnings).toContain(
    '[MSW] Warning: captured a GET https://mswjs.io/non-existing-page request without a corresponding request handler.',
  )
})
