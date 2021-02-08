import * as path from 'path'
import { runBrowserWith } from '../../support/runBrowserWith'

test('responds with a JSON response body', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'body-json.mocks.ts'),
  )

  const res = await runtime.request({
    url: runtime.makeUrl('/json'),
  })

  const headers = res.headers()
  expect(headers).toHaveProperty('content-type', 'application/json')

  const json = await res.json()
  expect(json).toEqual({ firstName: 'John' })

  return runtime.cleanup()
})
