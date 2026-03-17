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
  await loadExample(new URL('./body.mocks.ts', import.meta.url), {
    markup: new URL('./body-form-data.page.html', import.meta.url),
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
