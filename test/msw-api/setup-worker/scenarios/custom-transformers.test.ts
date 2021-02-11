import * as path from 'path'
import { pageWith } from 'page-with'
import * as JSONbig from 'json-bigint'

test('uses a custom transformer to parse BigInt in response body', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'custom-transformers.mocks.ts'),
  })

  const res = await runtime.request('/user')
  const body = await res.text()

  expect(body).toEqual(
    JSONbig.stringify({
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }),
  )
})
