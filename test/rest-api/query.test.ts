import * as path from 'path'
import { pageWith } from 'page-with'

function createRuntime() {
  return pageWith({
    example: path.resolve(__dirname, 'query.mocks.ts'),
  })
}

test('retrieves a single request URL query parameter', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    'https://test.mswjs.io/api/books?id=abc-123',
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    bookId: 'abc-123',
  })
})

test('retrieves multiple request URL query parameters', async () => {
  const runtime = await createRuntime()

  const res = await runtime.request(
    'https://test.mswjs.io/products?id=1&id=2&id=3',
    {
      method: 'POST',
    },
  )
  const status = res.status()
  const headers = await res.allHeaders()
  const body = await res.json()

  expect(status).toBe(200)
  expect(headers).toHaveProperty('x-powered-by', 'msw')
  expect(body).toEqual({
    productIds: ['1', '2', '3'],
  })
})
