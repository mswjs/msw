import { test, expect } from '../playwright.extend'

test('keeps the mocking enabled after hard-reload of the page', async ({
  loadExample,
  page,
  fetch,
}) => {
  await loadExample(require.resolve('./hard-reload.mocks.ts'))

  page.evaluate(() => {
    /**
     * Emulate a forced reload.
     * Since `location.reload(true)` is deprecated,
     * use a workaround.
     * @see https://stackoverflow.com/a/65544086/2754939
     */
    location.replace(location.href)
  })

  await page.waitForNavigation({
    waitUntil: 'networkidle',
  })

  const res = await fetch('https://api.github.com')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    mocked: true,
  })
})
