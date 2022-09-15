import { test, expect } from '../playwright.extend'

test('activates the worker without errors', async ({
  loadExample,
  spyOnConsole,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./exception-handling.mocks.ts'))

  expect(consoleSpy.get('error')).toBeUndefined()
})

test('transforms uncaught exceptions into a 500 response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./exception-handling.mocks.ts'))

  const res = await fetch('https://api.github.com/users/octocat')
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
