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

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)

  expect(libraryErrors).toHaveLength(0)
  expect(libraryWarnings).toContain(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET https://mswjs.io/non-existing-page

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

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

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)
  const requestHandlerWarning = libraryWarnings.find((text) => {
    return /\[MSW\] Warning: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(libraryErrors).toHaveLength(0)
  expect(requestHandlerWarning).toBeTruthy()
  expect(requestHandlerWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /user-details

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

  return runtime.cleanup()
})

test('suggests a similar request handler to an unhandled REST API request', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  const url = runtime.makeUrl('/users')
  await runtime.request({
    url,
  })

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)
  const unhandledRequestWarning = libraryWarnings.find((text) => {
    return /\[MSW\] Warning: captured a request without a matching request handler/.test(
      text,
    )
  })

  expect(libraryErrors).toHaveLength(0)
  expect(unhandledRequestWarning).toBeTruthy()
  expect(unhandledRequestWarning).toMatch(`\
[MSW] Warning: captured a request without a matching request handler:

  • GET /users

Did you mean to request "GET /user" instead?

If you still wish to intercept this unhandled request, please create a request handler for it. Read more: https://mswjs.io/docs/getting-started/mocks.`)

  return runtime.cleanup()
})
