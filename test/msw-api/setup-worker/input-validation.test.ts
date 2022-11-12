import { test, expect } from '../../playwright.extend'

test('throws an error given an Array of request handlers to "setupWorker"', async ({
  loadExample,
  page,
}) => {
  await loadExample(require.resolve('./input-validation.mocks.ts'))

  const exceptions: Array<string> = []

  page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })
  await page.reload({ waitUntil: 'networkidle' })

  expect(exceptions).toEqual(
    expect.arrayContaining([
      expect.stringContaining(
        '[MSW] Failed to construct "SetupWorkerApi" given an Array of request handlers. Make sure you spread the request handlers when calling the respective setup function.',
      ),
    ]),
  )
})
