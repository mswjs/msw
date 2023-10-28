/**
 * @vitest-environment node
 */
import fetch from 'node-fetch'
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('https://test.mswjs.io/books', () => {
    return HttpResponse.json({ title: 'Original title' })
  }),
)

beforeAll(() => {
  jest.spyOn(global.console, 'warn').mockImplementation()
  server.listen()
})

afterAll(() => {
  jest.restoreAllMocks()
  server.close()
})

test('removes all runtime request handlers when resetting without explicit next handlers', async () => {
  server.use(
    http.post('https://test.mswjs.io/login', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Request handlers added on runtime affect the network communication.
  const loginResponse = await fetch('https://test.mswjs.io/login', {
    method: 'POST',
  })
  const loginBody = await loginResponse.json()
  expect(loginResponse.status).toBe(200)
  expect(loginBody).toEqual({ accepted: true })

  // Once reset, all the runtime request handlers are removed.
  server.resetHandlers()

  const secondLoginResponse = await fetch('https://test.mswjs.io/login', {
    method: 'POST',
  })
  expect(secondLoginResponse.status).toBe(404)

  // Initial request handlers (given to `setupServer`) are not affected.
  const booksResponse = await fetch('https://test.mswjs.io/books')
  const booksBody = await booksResponse.json()
  expect(booksResponse.status).toBe(200)
  expect(booksBody).toEqual({ title: 'Original title' })
})

test('replaces all handlers with the explicit next runtime handlers upon reset', async () => {
  server.use(
    http.post('https://test.mswjs.io/login', () => {
      return HttpResponse.json({ accepted: true })
    }),
  )

  // Once reset with explicit next requets handlers,
  // replaces all present requets handlers with those.
  server.resetHandlers(
    http.get('https://test.mswjs.io/products', () => {
      return HttpResponse.json([1, 2, 3])
    }),
  )

  const loginResponse = await fetch('https://test.mswjs.io/login')
  expect(loginResponse.status).toBe(404)

  const booksResponse = await fetch('https://test.mswjs.io/books')
  expect(booksResponse.status).toBe(404)

  const productsResponse = await fetch('https://test.mswjs.io/products')
  const productsBody = await productsResponse.json()
  expect(productsResponse.status).toBe(200)
  expect(productsBody).toEqual([1, 2, 3])
})
