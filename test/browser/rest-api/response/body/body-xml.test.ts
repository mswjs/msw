import { test, expect } from '../../../playwright.extend'

test('responds with an XML response body', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./body-xml.mocks.ts', import.meta.url))

  const res = await fetch('/user')
  const status = res.status()
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/xml')
  expect(text).toEqual(`
<user>
  <id>abc-123</id>
  <firstName>John</firstName>
  <lastName>Maverick</lastName>
</user>`)
})
