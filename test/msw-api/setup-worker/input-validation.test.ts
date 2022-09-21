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
        '[MSW] Failed to call "setupWorker" given an Array of request handlers (setupWorker([a, b])), expected to receive each handler individually: setupWorker(a, b).',
      ),
    ]),
  )
})
