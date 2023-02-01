import { test, expect } from '../playwright.extend'

test('parses request URL parameters', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./params.mocks.ts'))

  const res = await fetch(
    'https://api.github.com/users/octocat/messages/abc-123',
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    username: 'octocat',
    messageId: 'abc-123',
  })
})
