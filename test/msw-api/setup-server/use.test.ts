/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer, SetupServerApi } from 'msw/node'
import { RequestHandler as ExpressRequestHandler } from 'express'
import { createServer, ServerApi } from '@open-draft/test-server'

let httpServer: ServerApi
let server: SetupServerApi

beforeAll(async () => {
  httpServer = await createServer((app) => {
    const handler: ExpressRequestHandler = (req, res) => {
      res.status(500).send('')
    }
    app.get('/book/:bookId', handler)
    app.post('/login', handler)
  })

  server = setupServer(
    rest.get(httpServer.http.makeUrl('/book/:bookId'), (req, res, ctx) => {
      return res(ctx.json({ title: 'Original title' }))
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
    rest.post(httpServer.http.makeUrl('/login'), (req, res, ctx) => {
      return res(ctx.json({ accepted: true }))
    }),
  )

  // Request handlers added on runtime affect network communication as usual.
  const loginResponse = await fetch(httpServer.http.makeUrl('/login'), {
    method: 'POST',
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.status).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await fetch(httpServer.http.makeUrl('/book/abc-123'))
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async () => {
  server.use(
    rest.get(httpServer.http.makeUrl('/book/:bookId'), (req, res, ctx) => {
      return res(ctx.json({ title: 'Permanent override' }))
    }),
  )

  const bookResponse = await fetch(httpServer.http.makeUrl('/book/abc-123'))
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await fetch(
    httpServer.http.makeUrl('/book/abc-123'),
  )
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookResponse.status).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async () => {
  server.use(
    rest.get(httpServer.http.makeUrl('/book/:bookId'), (req, res, ctx) => {
      return res.once(ctx.json({ title: 'One-time override' }))
    }),
  )

  const bookResponse = await fetch(httpServer.http.makeUrl('/book/abc-123'))
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await fetch(
    httpServer.http.makeUrl('/book/abc-123'),
  )
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookResponse.status).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a one-time request handler override only upon first request match with parallel requests', async () => {
  server.use(
    rest.get(httpServer.http.makeUrl('/book/:bookId'), (req, res, ctx) => {
      const { bookId } = req.params
      return res.once(ctx.json({ title: 'One-time override', bookId }))
    }),
  )

  const bookRequestPromise = fetch(httpServer.http.makeUrl('/book/abc-123'))
  const anotherBookRequestPromise = fetch(
    httpServer.http.makeUrl('/book/abc-123'),
  )

  const bookResponse = await bookRequestPromise
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override', bookId: 'abc-123' })

  const anotherBookResponse = await anotherBookRequestPromise
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookResponse.status).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})
