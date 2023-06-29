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
      .catch((error) => error)
  })

  await page.pause()

  expect(responseError).toEqual(new TypeError('Failed to fetch'))
  // Guard against false positives due to exceptions arising from the library.
  expect(responseError.cause).toBeUndefined()
})
