import { test, expect } from '../playwright.extend'

test('inherits cookies set on a preceeding request', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./cookies-http-only.mocks.ts'))

  await fetch('/login', { method: 'POST' })
  const response = await fetch('/user')

  await expect(response.json()).resolves.toEqual({
    firstName: 'John',
    lastName: 'Maverick',
  })
  expect(response.status()).toBe(200)
})
