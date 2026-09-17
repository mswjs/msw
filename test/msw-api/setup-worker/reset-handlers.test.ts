import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/book/:bookId', () => {
    return HttpResponse.json({ title: 'Original title' })
  }),
]

const test = defineNetwork({ handlers })

test('removes all runtime request handlers when resetting without explicit next handlers', async ({
  network,
  fetch,
}) => {
  network.use(
    http.post('*/login', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Request handlers added on runtime affect the network communication.
  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Reset request handlers to initial handlers.
  network.resetHandlers()

  // Any runtime request handlers are removed upon reset.
  const secondLoginResponse = await fetch('/login', {
    method: 'POST',
  })
  const secondLoginStatus = secondLoginResponse.status()
  expect(secondLoginStatus).toBe(404)

  // Initial request handlers (given to `setupWorker`) are not affected.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('replaces all handlers with the explicit next runtime handlers upon reset', async ({
  network,
  fetch,
}) => {
  // Add a runtime request handler.
  network.use(
    http.post('*/login', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Reset request handlers with explicit next handlers.
  network.resetHandlers(
    http.get('*/products', () => {
      return HttpResponse.json([1, 2, 3])
    }),
  )

  // Any runtime request handlers must be removed.
  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const secondLoginStatus = loginResponse.status()
  expect(secondLoginStatus).toBe(404)

  // Any initial request handler must be removed.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  expect(bookStatus).toEqual(404)

  // Should leave only explicit reset request handlers.
  const productsResponse = await fetch('/products')
  const productsStatus = productsResponse.status()
  const productsBody = await productsResponse.json()
  expect(productsStatus).toBe(200)
  expect(productsBody).toEqual([1, 2, 3])
})
