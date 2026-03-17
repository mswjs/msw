import { test, expect } from '../../../../playwright.extend'

test('warns on unhandled requests by default', async ({
  loadExample,
  spyOnConsole,
  fetch,
}) => {
  const consoleSpy = spyOnConsole()
  await loadExample(new URL('./default.mocks.ts', import.meta.url))

  const res = await fetch('https://mswjs.io/non-existing-page')
  const status = res.status()

  expect(consoleSpy.get('warning')).toEqual(
    expect.arrayContaining([
      expect.stringMatching(
        /\[MSW\] Warning: intercepted a request without a matching request handler/,
      ),
    ]),
  )

  expect(consoleSpy.get('error')).toBeUndefined()

  // Performs the request as-is.
  expect(status).toBe(404)
})
