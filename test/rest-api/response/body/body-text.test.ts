import * as path from 'path'
import { pageWith } from 'page-with'

test('responds with a text response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'body-text.mocks.ts'),
  })

  const res = await runtime.request('/text')

  const headers = await res.allHeaders()
  expect(headers).toHaveProperty('content-type', 'text/plain')

  const text = await res.text()
  expect(text).toBe('hello world')
})
