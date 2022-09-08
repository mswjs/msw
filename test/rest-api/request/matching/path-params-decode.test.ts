import { test, expect } from '../../../playwright.extend'

test('decodes url componets', async ({ loadExample, fetch }) => {
  await loadExample(require.resolve('./path-params-decode.mocks.ts'))

  const url = 'http://example.com:5001/example'
  const res = await fetch(
    `https://test.mswjs.io/reflect-url/${encodeURIComponent(url)}`,
  )

  expect(res.status()).toBe(200)
  expect(await res.allHeaders()).toHaveProperty('x-powered-by', 'msw')
  expect(await res.json()).toEqual({
    url,
  })
})
