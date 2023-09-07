import { test, expect } from '../../playwright.extend'

test('responds with a mocked error response using "Response.error" shorthand', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./response-error.mocks.ts'))

  const responseError = await page.evaluate(() => {
    return fetch('/resource')
      .then(() => null)
      .catch((error) => ({
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause,
      }))
  })

  // Responding with a "Response.error()" produced a "Failed to fetch" error,
  // breaking the request. This is analogous to a network error.
  expect(responseError?.name).toBe('TypeError')
  expect(responseError?.message).toBe('Failed to fetch')
  // Guard against false positives due to exceptions arising from the library.
  expect(responseError?.cause).toBeUndefined()
})
