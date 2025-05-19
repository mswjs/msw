import { test, expect } from '../../../playwright.extend'

test('decodes url componets', async ({ loadExample, fetch }) => {
  await loadExample(new URL('./path-params-decode.mocks.ts', import.meta.url))

  const url = 'http://example.com:5001/example'
  const res = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status()).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(await res.json()).toEqual({
    url,
  })
})
