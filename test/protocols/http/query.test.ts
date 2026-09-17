import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('https://test.mswjs.io/api/books', ({ request }) => {
    const url = new URL(request.url)
    const bookId = url.searchParams.get('id')

    return HttpResponse.json({ bookId })
  }),
  http.post('https://test.mswjs.io/products', ({ request }) => {
    const url = new URL(request.url)
    const productIds = url.searchParams.getAll('id')

    return HttpResponse.json({ productIds })
  }),
]

const test = defineNetwork({ handlers })

test('retrieves a single request URL query parameter', async ({ fetch }) => {
  const res = await fetch('https://test.mswjs.io/api/books?id=abc-123')
  const status = res.status()
  const body = await res.json()

  expect(status).toBe(200)
  expect(res.fromServiceWorker()).toBe(true)
  expect(body).toEqual({
    bookId: 'abc-123',
  })
})

test('retrieves multiple request URL query parameters', async ({ fetch }) => {
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
