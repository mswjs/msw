import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'path-params-decode.mocks.ts'),
  })
}

test('decodes url componets', async () => {
  const runtime = await createRuntime()

  const url = 'http://example.com:5001/example'

  const res = await runtime.request(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status()).toEqual(200)
  expect(await res.allHeaders()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    url,
  })
})
