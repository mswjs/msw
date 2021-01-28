import * as path from 'path'
import { runBrowserWith } from '../../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'warn.mocks.ts'))
}

test('warns on an unhandled REST API request with an absolute URL', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  const res = await runtime.request({
    url: 'https://mswjs.io/non-existing-page',
  })
  const status = res.status()

  expect(status).toBe(404)

  const libraryWarnings = messages.warning.filter(filterLibraryLogs)
  const unhandledRequestWarning = libraryWarnings.find((text) => {
    return /\[MSW\] Warning: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(unhandledRequestWarning).toBeDefined()
  expect(libraryWarnings).toHaveLength(1)

  return runtime.cleanup()
})

test('warns on an unhandled REST API request with a relative URL', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)

  const url = runtime.makeUrl('/user-details')
  const res = await runtime.request({
    url,
  })
  const status = res.status()

  expect(status).toBe(404)

  const libraryWarnings = messages.warning.filter(filterLibraryLogs)
  const unhandledRequestWarning = libraryWarnings.find((text) => {
    return /\[MSW\] Warning: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(unhandledRequestWarning).toBeDefined()
  expect(libraryWarnings).toHaveLength(1)

  return runtime.cleanup()
})
