import * as path from 'path'
import * as JSONbig from 'json-bigint'
import { runBrowserWith } from '../../../support/runBrowserWith'

test('uses a custom transformer to parse BigInt in response body', async () => {
  const runtime = await runBrowserWith(
    path.resolve(__dirname, 'custom-transformers.mocks.ts'),
  )

  const res = await runtime.request({
    url: `${runtime.origin}/user`,
  })
  const body = await res.text()

  expect(body).toEqual(
    JSONbig.stringify({
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }),
  )

  await runtime.cleanup()
})
