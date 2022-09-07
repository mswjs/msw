import { test, expect } from '../playwright.extend'

test('mocks response to a GET request', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./basic.mocks.ts'))

  const res = await fetch('https://api.github.com/users/octocat')
  const headers = res.headers()
  const body = await res.json()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
