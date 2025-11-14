// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

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

it('supports throwing a plain Response in a response resolver', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      // You can throw a Response instance in a response resolver
      // to short-circuit its execution and respond "early".
      throw new Response('hello world')
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect(response.status).toBe(200)
  await expect(response.text()).resolves.toBe('hello world')
})

it('supports throwing an HttpResponse instance in a response resolver', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw HttpResponse.text('hello world')
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  await expect(response.text()).resolves.toBe('hello world')
})

it('supports throwing an error response in a response resolver', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw HttpResponse.text('not found', { status: 400 })
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect(response.status).toBe(400)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  await expect(response.text()).resolves.toBe('not found')
})

it('supports throwing a network error in a response resolver', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw HttpResponse.error()
    }),
  )

  await expect(fetch('http://localhost/resource')).rejects.toThrow(
    'Failed to fetch',
  )
})

it('supports middleware-style responses', async () => {
  server.use(
    http.get('http://localhost/resource', ({ request }) => {
      const url = new URL(request.url)

      if (!url.searchParams.has('id')) {
        throw HttpResponse.text('must have id', { status: 400 })
      }

      return HttpResponse.text('ok')
    }),
  )

  const response = await fetch('http://localhost/resource?id=1')
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  await expect(response.text()).resolves.toBe('ok')

  const errorResponse = await fetch('http://localhost/resource')
  expect(errorResponse.status).toBe(400)
  expect(errorResponse.headers.get('Content-Type')).toBe('text/plain')
  await expect(errorResponse.text()).resolves.toBe('must have id')
})

it('coerces non-response errors into 500 error responses', async () => {
  server.use(
    http.get('http://localhost/resource', () => {
      throw new Error('Custom error')
    }),
  )

  const response = await fetch('http://localhost/resource')

  expect(response.status).toBe(500)
  expect(response.statusText).toBe('Unhandled Exception')
  await expect(response.json()).resolves.toEqual({
    name: 'Error',
    message: 'Custom error',
    stack: expect.any(String),
  })
})
