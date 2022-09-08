import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = require.resolve('./custom-request-handler.mocks.ts')

test('intercepts a request with a custom request handler with default context', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('https://test.mswjs.io/url/matters/not', {
    headers: {
      'x-custom-header': 'true',
    },
  })
  const body = await res.json()
  const headers = await res.allHeaders()

  expect(res.status()).toBe(401)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    error: 'Hey, this is a mocked error',
  })
})

test('intercepts a request with a custom request handler with custom context', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('https://test.url/')
  const body = await res.json()
  const headers = await res.allHeaders()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('content-type', 'application/hal+json')
  expect(body).toEqual({
    firstName: 'John',
    age: 42,
  })
})
