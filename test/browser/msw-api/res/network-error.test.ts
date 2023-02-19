import { test, expect } from '../../playwright.extend'

test('throws a network error', async ({ spyOnConsole, loadExample, page }) => {
  const consoleSpy = spyOnConsole()
  await loadExample(require.resolve('./network-error.mocks.ts'))

  // Do not use `runtime.request()`, because it always awaits a response.
  // In this case we await a network error, performing a request manually.
  const requestPromise = page.evaluate(() => {
    return fetch('/user')
  })

  await expect(requestPromise).rejects.toThrow(
    // The `fetch` call itself rejects with the "Failed to fetch" error,
    // the same error that happens on a regular network error.
    'TypeError: Failed to fetch',
  )

  // Assert a network error message printed into the console
  // before `fetch` rejects.
  expect(consoleSpy.get('error')).toEqual([
    'Failed to load resource: net::ERR_FAILED',
  ])
})
