import { test, expect } from '../../../../playwright.extend'

test('bypasses an unhandled request', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./bypass.mocks.ts', import.meta.url))

  const res = await fetch('https://mswjs.io/non-existing-page')
  const status = res.status()

  expect(consoleSpy.get('error')).toBeUndefined()
  expect(consoleSpy.get('warning')).toBeUndefined()

  // Performs the request as-is.
  expect(status).toBe(404)
})
