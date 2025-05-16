import { test, expect } from '../playwright.extend'

const EXAMPLE_PATH = new URL('./query.mocks.ts', import.meta.url)

test('retrieves a single request URL query parameter', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('https://test.mswjs.io/api/books?id=abc-123')
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    bookId: 'abc-123',
  })
})

test('retrieves multiple request URL query parameters', async ({
  loadExample,
  fetch,
}) => {
  await loadExample(EXAMPLE_PATH)

  const res = await fetch('https://test.mswjs.io/products?id=1&id=2&id=3', {
    method: 'POST',
  })
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    productIds: ['1', '2', '3'],
  })
})
