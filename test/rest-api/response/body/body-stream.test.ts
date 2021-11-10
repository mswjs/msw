import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with a ReadableStream response body', async () => {
  const { request } = await pageWith({
    example: path.resolve(__dirname, 'body-stream.mocks.ts'),
  })

  const res = await request('/sse')
  const status = res.status()
  const headers = await res.allHeaders()
  const text = await res.text()

  expect(status).toBe(200)
  expect(headers['content-type']).toBe('text/plain')
  expect(text).toBe('line1\nline2\n')
})
