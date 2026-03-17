import { test, expect } from '../playwright.extend'

test('mocks a response to an XMLHttpRequest', async ({ loadExample, page }) => {
  await loadExample(new URL('./xhr.mocks.ts', import.meta.url))

  const REQUEST_URL = 'https://api.github.com/users/octocat'

  page.evaluate((url) => {
    const req = new XMLHttpRequest()
    req.open('GET', url)
    req.send()
  }, REQUEST_URL)

  const res = await page.waitForResponse(REQUEST_URL)
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(body).toEqual({
    mocked: true,
  })
})
