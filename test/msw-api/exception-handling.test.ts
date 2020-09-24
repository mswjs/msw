import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'
import { captureConsole } from '../support/captureConsole'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'exception-handling.mocks.ts'))
}

test('activates the worker without errors', async () => {
  const runtime = await createRuntime()
  const { messages } = captureConsole(runtime.page)
  await runtime.reload()

  expect(messages.error).toHaveLength(0)

  return runtime.cleanup()
})

test('transforms uncaught exceptions into a 500 response', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://api.github.com/users/octocat',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toEqual(500)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).toHaveProperty('errorType', 'ReferenceError')
  expect(body).toHaveProperty('message', 'nonExisting is not defined')

  return runtime.cleanup()
})
