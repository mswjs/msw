import { test, expect } from '../../../playwright.extend'

test('responds with an HTML response body', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./body-html.mocks.ts', import.meta.url))

  const res = await fetch('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/html')
  expect(text).toEqual(`
<p class="user" id="abc-123">
  Jane Doe
</p>`)
})
