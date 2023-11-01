/**
 * @vitest-environment node
 */
import fetch from 'node-fetch'
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
  const res = await fetch('http://localhost/text')
  const text = await res.text()

  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('text/plain')
  expect(text).toBe('hello world')
})
