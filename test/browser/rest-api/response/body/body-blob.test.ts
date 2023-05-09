import { test, expect } from '../.././../playwright.extend'

test('responds to a request with a Blob', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./body-blob.mocks.ts'))
  const res = await fetch('/greeting')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(headers).toHaveProperty('x-powered-by', 'msw')

  const text = await res.text()
  expect(text).toBe('hello world')
})
