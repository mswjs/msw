import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'

let runtime: TestAPI

beforeAll(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'callback.mocks.ts'))
})

afterEach(async () => {
  await runtime.cleanup()
})

test('executes a given callback on an unhandled request', async () => {
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(404)

  // Custom callback executed.
  expect(messages.log).toContain(
    'Oops, unhandled GET https://mswjs.io/non-existing-page',
  )

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)

  // No warnings/errors produced by MSW.
  expect(libraryErrors).toHaveLength(0)
  expect(libraryWarnings).toHaveLength(0)
})
