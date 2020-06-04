/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
    return res(ctx.json({ title: 'Original title' }))
  }),
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

test('returns a mocked response from a runtime request handler upon match', async () => {
  server.use(
    rest.post('https://mswjs.io/login', (req, res, ctx) => {
      return res(ctx.json({ accepted: true }))
    }),
  )

  // Request handlers added on runtime affect network communication as usual.
  const loginResponse = await fetch('https://mswjs.io/login', {
    method: 'POST',
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.status).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Other request handlers are preserved, if there are no overlaps.
  const bookResponse = await fetch('https://mswjs.io/book/abc-123')
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'Original title' })
})

test('returns a mocked response from a persistent request handler override', async () => {
  server.use(
    rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
      return res(ctx.json({ title: 'Permanent override' }))
    }),
  )

  const bookResponse = await fetch('https://mswjs.io/book/abc-123')
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'Permanent override' })

  const anotherBookResponse = await fetch('https://mswjs.io/book/abc-123')
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookResponse.status).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Permanent override' })
})

test('returns a mocked response from a one-time request handler override only upon first request match', async () => {
  server.use(
    rest.get('https://mswjs.io/book/:bookId', (req, res, ctx) => {
      return res.once(ctx.json({ title: 'One-time override' }))
    }),
  )

  const bookResponse = await fetch('https://mswjs.io/book/abc-123')
  const bookBody = await bookResponse.json()
  expect(bookResponse.status).toBe(200)
  expect(bookBody).toEqual({ title: 'One-time override' })

  const anotherBookResponse = await fetch('https://mswjs.io/book/abc-123')
  const anotherBookBody = await anotherBookResponse.json()
  expect(anotherBookResponse.status).toBe(200)
  expect(anotherBookBody).toEqual({ title: 'Original title' })
})
