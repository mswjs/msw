import { http, HttpResponse } from 'msw'
import { defineNetwork, expect } from '../../setup/vitest-helpers'

const handlers = [
  http.get('*/book/:bookId', function originalResolver() {
    return HttpResponse.json({
      title: 'Original title',
    })
  }),
]

const test = defineNetwork({ handlers })

test('returns a mocked response from a runtime request handler upon match', async ({
  network,
  fetch,
}) => {
  network.use(
    http.post('*/login', function postLoginResolver() {
      return HttpResponse.json({ accepted: true })
    }),
  )

  const loginResponse = await fetch('/login', {
    method: 'POST',
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async ({
  network,
  fetch,
}) => {
  network.use(
    http.get('*/book/:bookId', function permanentOverride() {
      return HttpResponse.json({ title: 'Permanent override' })
    }),
  )

  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await fetch('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async ({
  network,
  fetch,
}) => {
  network.use(
    http.get(
      '*/book/:bookId',
      function oneTimeOverride() {
        return HttpResponse.json({ title: 'One-time override' })
      },
      { once: true },
    ),
  )

  const bookResponse = await fetch('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await fetch('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a one-time request handler override only upon first request match with parallel requests', async ({
  network,
  fetch,
}) => {
  network.use(
    http.get<{ bookId: string }>(
      '*/book/:bookId',
      function oneTimeOverride({ params }) {
        const { bookId } = params

        return HttpResponse.json({ title: 'One-time override', bookId })
      },
      { once: true },
    ),
  )

  const bookPromise = fetch('/book/abc-123')

  const anotherBookPromise = fetch('/book/abc-123')

  const bookResponse = await bookPromise
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)

  const anotherBookResponse = await anotherBookPromise
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect([bookBody, anotherBookBody]).toEqual(
    expect.arrayContaining([
      { title: 'One-time override', bookId: 'abc-123' },
      { title: 'Original title' },
    ]),
  )
})
