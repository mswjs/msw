import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with an XML response body', async () => {
  const { request } = await pageWith({
    example: path.resolve(__dirname, 'body-xml.mocks.ts'),
  })

  const res = await request('/user')
  const status = res.status()
  const headers = res.headers()
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
