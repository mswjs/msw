import * as path from 'path'
import { pageWith } from 'page-with'
import { SetupWorkerApi, rest, HttpResponse } from 'msw'

declare namespace window {
  export const msw: {
    worker: SetupWorkerApi
    rest: typeof rest
    HttpResponse: typeof HttpResponse
  }
}

test('returns a mocked response from a runtime request handler upon match', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'use.mocks.ts'),
  })

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.post('/login', function postLoginResolver() {
        return HttpResponse.json({ accepted: true })
      }),
    )
  })

  const loginResponse = await runtime.request('/login', {
    method: 'POST',
  })
  const loginStatus = loginResponse.status()
  const loginBody = await loginResponse.json()
  expect(loginStatus).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await runtime.request('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'use.mocks.ts'),
  })

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get('/book/:bookId', function permanentOverride() {
        return HttpResponse.json({ title: 'Permanent override' })
      }),
    )
  })

  const bookResponse = await runtime.request('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await runtime.request('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'use.mocks.ts'),
  })

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get(
        '/book/:bookId',
        function oneTimeOverride() {
          return HttpResponse.json({ title: 'One-time override' })
        },
        { once: true },
      ),
    )
  })

  const bookResponse = await runtime.request('/book/abc-123')
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await runtime.request('/book/abc-123')
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a one-time request handler override only upon first request match with parallel requests', async () => {
  const runtime = await pageWith({
    example: path.resolve(__dirname, 'use.mocks.ts'),
  })

  await runtime.page.evaluate(() => {
    const { msw } = window

    msw.worker.use(
      msw.rest.get<{ bookId: string }>(
        '/book/:bookId',
        function oneTimeOverride({ params }) {
          const { bookId } = params

          return msw.HttpResponse.json({ title: 'One-time override', bookId })
        },
        { once: true },
      ),
    )
  })

  const bookPromise = runtime.request('/book/abc-123')

  const anotherBookPromise = runtime.request('/book/abc-123')

  const bookResponse = await bookPromise
  const bookStatus = bookResponse.status()
  const bookBody = await bookResponse.json()
  expect(bookStatus).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override', bookId: 'abc-123' })

  const anotherBookResponse = await anotherBookPromise
  const anotherBookStatus = anotherBookResponse.status()
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookStatus).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})
