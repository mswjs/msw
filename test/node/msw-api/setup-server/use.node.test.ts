/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, rest } from 'msw'
import { SetupServer, setupServer } from 'msw/node'
import { RequestHandler as ExpressRequestHandler } from 'express'
import { HttpServer } from '@open-draft/test-server/http'

const httpServer = new HttpServer((app) => {
  const handler: ExpressRequestHandler = (req, res) => {
    res.status(500).send('')
  }
  app.get('/book/:bookId', handler)
  app.post('/login', handler)
})

let server: SetupServer

beforeAll(async () => {
  await httpServer.listen()

  server = setupServer(
    rest.get<{ bookId: string }>(httpServer.http.url('/book/:bookId'), () => {
      return HttpResponse.json({ title: 'Original title' })
    }),
  )

  server.listen()
})

afterEach(() => {
  server.resetHandlers()
})

afterAll(async () => {
  server.close()
  await httpServer.close()
})

test('returns a mocked response from a runtime request handler upon match', async () => {
  server.use(
    rest.post(httpServer.http.url('/login'), () => {
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
  server.use(
    rest.get<{ bookId: string }>(httpServer.http.url('/book/:bookId'), () => {
      return HttpResponse.json({ title: 'Permanent override' })
    }),
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
  server.use(
    rest.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId'),
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
  server.use(
    rest.get<{ bookId: string }>(
      httpServer.http.url('/book/:bookId'),
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
