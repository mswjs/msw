import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'custom-request-handler.mocks.ts'),
  })
}

test('intercepts a request with a custom request handler with default context', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://test.mswjs.io/url/matters/not', {
    headers: {
      'x-custom-header': 'true',
    },
  })
  const body = await res.json()
  const headers = res.headers()

  expect(res.status()).toBe(401)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    error: 'Hey, this is a mocked error',
  })
})

test('intercepts a request with a custom request handler with custom context', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request('https://test.url/')
  const body = await res.json()
  const headers = res.headers()

  expect(res.status()).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(headers).toHaveProperty('content-type', 'application/hal+json')
  expect(body).toEqual({
    firstName: 'John',
    age: 42,
  })
})
