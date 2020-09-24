import * as path from 'path'
import { runBrowserWith } from '../support/runBrowserWith'

function createRuntime() {
  return runBrowserWith(path.resolve(__dirname, 'query.mocks.ts'))
}

test('retrieves a single request URL query parameter', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://test.mswjs.io/api/books?id=abc-123',
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    bookId: 'abc-123',
  })

  return runtime.cleanup()
})

test('retrieves multiple request URL query parameters', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request({
    url: 'https://test.mswjs.io/products?id=1&id=2&id=3',
    fetchOptions: {
      method: 'POST',
    },
  })
  const status = res.status()
  const headers = res.headers()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    productIds: ['1', '2', '3'],
  })

  return runtime.cleanup()
})
