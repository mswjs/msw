import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('responds with a text response body', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'body-text.mocks.ts'),
  )

  const res = await runtime.request({
    url: runtime.makeUrl('/text'),
  })

  const headers = res.headers()
  expect(headers).toHaveProperty('content-type', 'text/plain')

  const text = await res.text()
  expect(text).toBe('hello world')

  return runtime.cleanup()
})
