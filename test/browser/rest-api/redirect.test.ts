import { test, expect } from '../playwright.extend'

test('supports redirect in a mocked response', async ({
  loadExample,
  fetch,
  makeUrl,
  page,
}) => {
  await loadExample(require.resolve('./redirect.mocks.ts'))

  const [res, redirectRes] = await Promise.all([
    await fetch('/login'),
    await page.waitForResponse(makeUrl('/user')),
  ])
  const headers = await res.allHeaders()

  // Assert the original response returns redirect.
  expect(headers).toHaveProperty('location', '/user')
  expect(res.fromServiceWorker()).toBe(true)
  expect(res.status()).toBe(307)

  const redirectStatus = redirectRes.status()
  const redirectBody = await redirectRes.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectRes.fromServiceWorker()).toBe(true)
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
