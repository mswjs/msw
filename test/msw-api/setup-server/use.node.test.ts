// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'
import { createTestHttpServer } from '@epic-web/test-server/http'

const server = setupServer()

beforeAll(() => {
  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(() => {
  server.close()
})

test('returns a mocked response from a runtime request handler upon match', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      const handler = () => {
        return new Response('', { status: 500 })
      }
      router.get('/book/:bookId', handler)
      router.post('/login', handler)
    },
  })
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'Original title' })
      },
    ),
  )
  server.use(
    http.post(httpServer.http.url('/login').href, () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Request handlers added on runtime affect network communication as usual.
  const loginResponse = await fetch(httpServer.http.url('/login'), {
    method: 'POST',
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.status).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await fetch(httpServer.http.url('/book/abc-123'))
  expect(bookResponse.status).toBe(200)
  expect(await bookResponse.json()).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/book/:bookId', () => {
        return new Response('', { status: 500 })
      })
    },
  })
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'Original title' })
      },
    ),
  )
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'Permanent override' })
      },
    ),
  )

  const bookResponse = await fetch(httpServer.http.url('/book/abc-123'))
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await fetch(httpServer.http.url('/book/abc-123'))
  expect(anotherBookResponse.status).toBe(200)
  expect(await anotherBookResponse.json()).toEqual({
    title: 'Permanent override',
  })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/book/:bookId', () => {
        return new Response('', { status: 500 })
      })
    },
  })
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'Original title' })
      },
    ),
  )
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'One-time override' })
      },
      { once: true },
    ),
  )

  const bookResponse = await fetch(httpServer.http.url('/book/abc-123'))
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await fetch(httpServer.http.url('/book/abc-123'))
  expect(anotherBookResponse.status).toBe(200)
  expect(await anotherBookResponse.json()).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a one-time request handler override only upon first request match with parallel requests', async () => {
  await using httpServer = await createTestHttpServer({
    defineRoutes(router) {
      router.get('/book/:bookId', () => {
        return new Response('', { status: 500 })
      })
    },
  })
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      () => {
        return HttpResponse.json({ title: 'Original title' })
      },
    ),
  )
  server.use(
    http.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId').href,
      ({ params }) => {
        return HttpResponse.json({
          title: 'One-time override',
          bookId: params.bookId,
        })
      },
      { once: true },
    ),
  )

  const bookRequestPromise = fetch(httpServer.http.url('/book/abc-123'))
  const anotherBookRequestPromise = fetch(httpServer.http.url('/book/abc-123'))

  const bookResponse = await bookRequestPromise
  expect(bookResponse.status).toBe(200)
  expect(await bookResponse.json()).toEqual({
    title: 'One-time override',
    bookId: 'abc-123',
  })

  const anotherBookResponse = await anotherBookRequestPromise
  expect(anotherBookResponse.status).toBe(200)
  expect(await anotherBookResponse.json()).toEqual({ title: 'Original title' })
})

test('throws if provided the invalid handlers array', async () => {
  expect(() =>
    server.use(
      // @ts-expect-error Intentionally invalid input.
      [http.get('*', () => new Response())],
    ),
  ).toThrow(
    '[MSW] Failed to call "use()" with the given request handlers: invalid input. Did you forget to spread the array of request handlers?',
  )
})
