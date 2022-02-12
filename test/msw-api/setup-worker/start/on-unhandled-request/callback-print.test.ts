import * as path from 'path'
import { pageWith } from 'page-with'

test('executes a default "warn" strategy in a custom callback', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'callback-print.mocks.ts'),
  })

  const res = await request('https://mswjs.io/use-warn')
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
[MSW] Warning: captured a request without a matching request handler:

  • GET https://mswjs.io/use-warn

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})

test('executes a default "error" strategy in a custom callback', async () => {
  const { request, consoleSpy } = await pageWith({
    example: path.resolve(__dirname, 'callback-print.mocks.ts'),
  })

  const res = await request('https://mswjs.io/use-error')
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
[MSW] Error: captured a request without a matching request handler:

  • GET https://mswjs.io/use-error

If you still wish to intercept this unhandled request, please create a request handler for it.
Read more: https://mswjs.io/docs/getting-started/mocks`),
    ]),
  )
})
