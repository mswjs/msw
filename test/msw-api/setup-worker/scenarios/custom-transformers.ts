import * as path from 'path'
import * as JSONbig from 'json-bigint'
import { runBrowserWith } from '../../../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'custom-transformers.mocks.ts'))
}

test('should use custom transformes and parse BigInt', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: `${runtime.origin}/me`,
  })
  const body = await res.text()
  expect(body).toEqual(
    JSONbig.stringify({
      username: 'Dude',
      balance: BigInt(1597928668063727616),
    }),
  )

  await runtime.cleanup()
})
