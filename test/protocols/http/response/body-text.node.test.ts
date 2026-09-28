// @vitest-environment node
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/text', () => {
    return HttpResponse.text('hello world')
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

test('responds with a text response body', async () => {
  const response = await fetch('http://localhost/text')
  const text = await response.text()

  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toBe('text/plain')
  expect(text).toBe('hello world')
})

test('implicitly sets "Content-Length" header on a text response', async () => {
  const response = await fetch('http://localhost/text')
  expect(response.headers.get('Content-Length')).toBe('11')
})

test('implicitly sets "Content-Length" header to 0 on empty text response', async () => {
  server.use(
    http.get('http://localhost/text', () => {
      return HttpResponse.text('')
    }),
  )

  const response = await fetch('http://localhost/text')
  expect(response.headers.get('Content-Length')).toBe('0')
})

test('respects custom "Content-Length" mocked response header', async () => {
  server.use(
    http.get('http://localhost/text', () => {
      return HttpResponse.text('hello-world', {
        headers: {
          'Content-Length': '32',
        },
      })
    }),
  )

  const response = await fetch('http://localhost/text')
  expect(response.headers.get('Content-Length')).toBe('32')
})
