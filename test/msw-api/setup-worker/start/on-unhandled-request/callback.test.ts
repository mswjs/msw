import { test, expect } from '../../../../playwright.extend'

test('executes a given callback on an unhandled request', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./callback.mocks.ts'))

  const res = await fetch('https://mswjs.io/non-existing-page')
  const status = res.status()

  // Request is performed as-is.
  expect(status).toBe(404)

  // Custom callback executed.
  expect(consoleSpy.get('log')).toContain(
    'Oops, unhandled GET https://mswjs.io/non-existing-page',
  )

  // No warnings/errors produced by MSW.
  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()
})
