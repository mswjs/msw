import { test, expect } from '../playwright.extend'

test('parses request URL parameters', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./params.mocks.ts', import.meta.url))

  const res = await fetch(
    'https://api.github.com/users/octocat/messages/abc-123',
  )
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })
})
