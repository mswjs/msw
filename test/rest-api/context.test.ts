import { test, expect } from '../playwright.extend'

test('composes various context utilities into a valid mocked response', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(require.resolve('./context.mocks.ts'))

  const res = await fetch('https://test.mswjs.io/')
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(res.status()).toEqual(201)
  expect(res.statusText()).toEqual('Yahoo!')
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('content-type', 'application/json')
  expect(headers).toHaveProperty('accept', 'foo/bar')
  expect(headers).toHaveProperty('custom-header', 'arbitrary-value')
  expect(body).toEqual({
    mocked: true,
  })
})
