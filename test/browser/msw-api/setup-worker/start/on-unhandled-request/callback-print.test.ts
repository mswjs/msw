import { test, expect } from '../../../../playwright.extend'

test('executes a default "warn" strategy in a custom callback', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./callback-print.mocks.ts', import.meta.url))

  const res = await fetch('https://mswjs.io/use-warn')
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(404)

  // Custom callback executed.
  expect(consoleSpy.get('log')).toContain(
    'Oops, unhandled GET https://mswjs.io/use-warn',
  )
  expect(consoleSpy.get('error')).toBeUndefined()

  // Prints the unhandled request warning upon `print.warning()`.
  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Warning: intercepted a request without a matching request handler:

  • GET https://mswjs.io/use-warn

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
})

test('executes a default "error" strategy in a custom callback', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./callback-print.mocks.ts', import.meta.url))

  const res = await fetch('https://mswjs.io/use-error')
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(500)

  // Custom callback executed.
  expect(consoleSpy.get('log')).toContain(
    'Oops, unhandled GET https://mswjs.io/use-error',
  )
  expect(consoleSpy.get('warning')).toBeUndefined()

  // Prints the unhandled request error upon `print.error()`.
  expect(consoleSpy.get('error')).toEqual(
    expect.arrayContaining([
      expect.stringContaining(`\
[MSW] Error: intercepted a request without a matching request handler:

  • GET https://mswjs.io/use-error

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/http/intercepting-requests`),
    ]),
  )
})
