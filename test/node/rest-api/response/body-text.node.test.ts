/**
 * @vitest-environment node
 */
import { HttpResponse, http } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('http://localhost/text', () => {
    return HttpResponse.text('hello world')
  }),
  http.get('http://localhost/text-with-custom-length', () => {
    return HttpResponse.text('hello-world', {
      headers: {
        'Content-Length': '32',
      },
    })
  }),
)

beforeAll(() => {
  server.listen()
})

afterAll(() => {
  server.close()
})

it('responds with a text response body', async () => {
  const res = await fetch('http://localhost/text')
  const text = await res.text()

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/plain')
  expect(text).toBe('hello world')
})

it('implicitly sets "Content-Length" header on text responses', async () => {
  const response = await fetch('http://localhost/text')
  expect(response.headers.get('Content-Length')).toBe('11')
})

it('respects custom "Content-Length" mocked response header', async () => {
  const response = await fetch('http://localhost/text-with-custom-length')
  expect(response.headers.get('Content-Length')).toBe('32')
})
