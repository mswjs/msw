import * as path from 'path'
import { TestAPI, runBrowserWith } from '../../../../support/runBrowserWith'
import {
  captureConsole,
  filterLibraryLogs,
} from '../../../../support/captureConsole'

let runtime: TestAPI

beforeEach(async () => {
  runtime = await runBrowserWith(path.resolve(__dirname, 'warn.mocks.ts'))
})

afterEach(async () => {
  await runtime.cleanup()
})

test('warns on an absolute unhandled request', async () => {
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
[MSW] Warning: captured a GET https://mswjs.io/non-existing-page request without a corresponding request handler.

  If you wish to intercept this request, consider creating a request handler for it:

  rest.get('https://mswjs.io/non-existing-page', (req, res, ctx) => {
    return res(ctx.text('body'))
  })`)
})

test('warns on a relative unhandled request', async () => {
  const { messages } = captureConsole(runtime.page)

  const url = `${runtime.origin}/user-details`
  const res = await runtime.request({
    url,
  })
  const status = res.status()

  expect(status).toBe(404)

  const libraryErrors = messages.error.filter(filterLibraryLogs)
  const libraryWarnings = messages.warning.filter(filterLibraryLogs)
  const requestHandlerWarning = libraryWarnings.find((text) => {
    return /\[MSW\] Warning: captured a GET .+? request without a corresponding request handler/.test(
      text,
    )
  })

  expect(libraryErrors).toHaveLength(0)
  expect(requestHandlerWarning).toBeTruthy()
  expect(requestHandlerWarning).toMatch(`\
[MSW] Warning: captured a GET ${url} request without a corresponding request handler.

  If you wish to intercept this request, consider creating a request handler for it:

  rest.get('/user-details', (req, res, ctx) => {
    return res(ctx.text('body'))
  })`)
})
