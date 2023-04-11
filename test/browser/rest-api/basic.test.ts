import { test, expect } from '../playwright.extend'

test('mocks response to a GET request', async ({
  loadExample,
  fetch,
  page,
}) => {
  await loadExample(require.resolve('./basic.mocks.ts'))

  await page.pause()

  const response = await fetch('https://example.com/users/octocat')
  const status = response.status()
  const headers = response.headers()
  const body = await response.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
