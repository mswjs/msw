import { test, expect } from '../../../playwright.extend'

test('responds with a empty response body', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./body-empty.mocks.ts'))

  const res = await fetch('/empty')
  const headers = await res.allHeaders()

  expect(res.status()).toBe(204)
  expect(headers).not.toHaveProperty('content-type')
  await expect(res.json()).rejects.toThrowError(
    'No data found for resource with given identifier',
  )
})
