import * as JSONBig from 'json-bigint'
import { test, expect } from '../../../playwright.extend'

test('uses a custom transformer to parse BigInt in response body', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(new URL('./custom-transformers.mocks.ts', import.meta.url))

  const res = await fetch('/user')
  const body = await res.text()

  expect(body).toEqual(
    JSONBig.stringify({
      username: 'john.maverick',
      balance: BigInt(1597928668063727616),
    }),
  )
})
