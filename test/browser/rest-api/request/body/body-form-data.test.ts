import { test, expect } from '../../../playwright.extend'

declare global {
  interface Window {
    makeRequest(): void
  }
}

test('handles FormData as a request body', async ({
  loadExample,
  page,
  makeUrl,
}) => {
  await loadExample(require.resolve('./body.mocks.ts'), {
    markup: require.resolve('./body-form-data.page.html'),
  })

  await page.evaluate(() => window.makeRequest())

  const res = await page.waitForResponse(makeUrl('/formData'))
  const status = res.status()
  const json = await res.json()

  expect(status).toBe(200)
  expect(json).toEqual({
    name: 'Alice',
    file: 'hello world',
    ids: [1, 2, 3],
  })
})
