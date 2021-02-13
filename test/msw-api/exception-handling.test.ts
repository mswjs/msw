import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'exception-handling.mocks.ts'),
  })
}

test('activates the worker without errors', async () => {
  const { consoleSpy } = await createRuntime()
  expect(consoleSpy.get('error')).toBeUndefined()
})

test('transforms uncaught exceptions into a 500 response', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://api.github.com/users/octocat')
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toEqual(500)
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(body).toHaveProperty('errorType', 'ReferenceError')
  expect(body).toHaveProperty('message', 'nonExisting is not defined')
})
