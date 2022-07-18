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
  const headers = await res.allHeaders()

  expect(res.status()).toBe(500)
  expect(res.statusText()).toBe('Request Handler Error')
  expect(headers).not.toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    name: 'ReferenceError',
    message: 'nonExisting is not defined',
    stack: expect.stringContaining(
      'ReferenceError: nonExisting is not defined',
    ),
  })
})
