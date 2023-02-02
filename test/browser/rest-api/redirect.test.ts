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
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(res.status()).toBe(307)

  const redirectStatus = redirectRes.status()
  const redirectHeaders = await redirectRes.allHeaders()
  const redirectBody = await redirectRes.json()

  // Assert redirect gets requested and mocked.
  expect(redirectStatus).toBe(200)
  expect(redirectHeaders).toHaveProperty('x-powered-by', 'msw')
  expect(redirectBody).toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
})
