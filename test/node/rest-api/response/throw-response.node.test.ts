/**
 * @vitest-environment node
 */
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
    http.get('https://example.com/', () => {
      // You can throw a Response instance in a response resolver
      // to short-circuit its execution and respond "early".
      throw new Response('hello world')
    }),
  )

  const response = await fetch('https://example.com')

  expect(response.status).toBe(200)
  expect(await response.text()).toBe('hello world')
})

it('supports throwing an HttpResponse instance in a response resolver', async () => {
  server.use(
    http.get('https://example.com/', () => {
      throw HttpResponse.text('hello world')
    }),
  )

  const response = await fetch('https://example.com')

  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  expect(await response.text()).toBe('hello world')
})

it('supports throwing an error response in a response resolver', async () => {
  server.use(
    http.get('https://example.com/', () => {
      throw HttpResponse.text('not found', { status: 400 })
    }),
  )

  const response = await fetch('https://example.com')

  expect(response.status).toBe(400)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  expect(await response.text()).toBe('not found')
})

it('supports throwing a network error in a response resolver', async () => {
  server.use(
    http.get('https://example.com/', () => {
      throw HttpResponse.error()
    }),
  )

  await expect(fetch('https://example.com')).rejects.toThrow('Failed to fetch')
})

it('supports middleware-style responses', async () => {
  server.use(
    http.get('https://example.com/', ({ request }) => {
      const url = new URL(request.url)

      if (!url.searchParams.has('id')) {
        throw HttpResponse.text('must have id', { status: 400 })
      }

      return HttpResponse.text('ok')
    }),
  )

  const response = await fetch('https://example.com/?id=1')
  expect(response.status).toBe(200)
  expect(response.headers.get('Content-Type')).toBe('text/plain')
  expect(await response.text()).toBe('ok')

  const errorResponse = await fetch('https://example.com/')
  expect(errorResponse.status).toBe(400)
  expect(errorResponse.headers.get('Content-Type')).toBe('text/plain')
  expect(await errorResponse.text()).toBe('must have id')
})

it('throws non-Response errors as-is', async () => {
  server.use(
    http.get('https://example.com/', () => {
      throw new Error('Oops!')
    }),
  )

  const requestError = await fetch('https://example.com/')
    .then(() => null)
    .catch((error) => error)

  expect(requestError.name).toBe('TypeError')
  expect(requestError.message).toBe('Failed to fetch')
  // Undici forwards the original error in the "cause" property.
  expect(requestError.cause).toEqual(new Error('Oops!'))
})
