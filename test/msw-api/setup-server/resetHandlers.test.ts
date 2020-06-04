/**
 * @jest-environment node
 */
import fetch from 'node-fetch'
import { rest } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  rest.get('https://mswjs.io/books', (req, res, ctx) => {
    return res(ctx.json({ title: 'Original title' }))
  }),
)

beforeAll(() => server.listen())
afterAll(() => server.close())

test('removes all runtime request handlers when resetting without explicit next handlers', async () => {
  server.use(
    rest.post('https://mswjs.io/login', (req, res, ctx) => {
      return res(ctx.json({ accepted: true }))
    }),
  )

  // Request handlers added on runtime affect the network communication.
  const loginResponse = await fetch('https://mswjs.io/login', {
    method: 'POST',
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.status).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Once reset, all the runtime request handlers are removed.
  server.resetHandlers()

  const secondLoginResponse = await fetch('https://mswjs.io/login', {
    method: 'POST',
  })
  expect(secondLoginResponse.status).toBe(404)

  // Initial request handlers (given to `setupServer`) are not affected.
  const booksResponse = await fetch('https://mswjs.io/books')
  const booksBody = await booksResponse.json()
  expect(booksResponse.status).toBe(200)
  expect(booksBody).toEqual({ title: 'Original title' })
})

test('replaces all handlers with the explicit next runtime handlers upon reset', async () => {
  server.use(
    rest.post('https://mswjs.io/login', (req, res, ctx) => {
      return res(ctx.json({ accepted: true }))
    }),
  )

  // Once reset with explicit next requets handlers,
  // replaces all present requets handlers with those.
  server.resetHandlers(
    rest.get('https://mswjs.io/products', (req, res, ctx) => {
      return res(ctx.json([1, 2, 3]))
    }),
  )

  const loginResponse = await fetch('https://mswjs.io/login')
  expect(loginResponse.status).toBe(404)

  const booksResponse = await fetch('https://mswjs.io/books')
  expect(booksResponse.status).toBe(404)

  const productsResponse = await fetch('https://mswjs.io/products')
  const productsBody = await productsResponse.json()
  expect(productsResponse.status).toBe(200)
  expect(productsBody).toEqual([1, 2, 3])
})
