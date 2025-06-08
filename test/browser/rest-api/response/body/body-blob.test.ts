import { test, expect } from '../.././../playwright.extend'

test('responds to a request with a Blob', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./body-blob.mocks.ts', import.meta.url))
  const res = await fetch('/greeting')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(res.fromServiceWorker()).toBe(true)

  const text = await res.text()
  expect(text).toBe('hello world')
})
