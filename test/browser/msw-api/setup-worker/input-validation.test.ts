import { test, expect } from '../../playwright.extend'

test('throws an error given an Array of request handlers to "setupWorker"', async ({
  loadExample,
  page,
}) => {
  await loadExample(new URL('./input-validation.mocks.ts', import.meta.url), {
    skipActivation: true,
  })

  const exceptions: Array<string> = []
  page.on('pageerror', (error) => {
    exceptions.push(error.message)
  })

  await page.reload({ waitUntil: 'networkidle' })

  await expect
    .poll(() => exceptions)
    .toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '[MSW] Failed to apply given request handlers: invalid input. Did you forget to spread the request handlers Array?',
        ),
      ]),
    )
})
