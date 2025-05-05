import { test, expect } from '../../../playwright.extend'

test('responds with a text response body', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./body-text.mocks.ts', import.meta.url))

  const res = await fetch('/text')
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(headers).toHaveProperty('content-type', 'text/plain')
  expect(text).toBe('hello world')
})
