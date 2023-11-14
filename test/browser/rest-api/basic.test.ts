import { test, expect } from '../playwright.extend'

test('mocks response to a GET request', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./basic.mocks.ts'))

  const response = await fetch('https://example.com/users/octocat')
  const status = response.status()
  const body = await response.json()

  expect(status).toBe(200)
  expect(response.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    name: 'John Maverick',
    originalUsername: 'octocat',
  })
})
